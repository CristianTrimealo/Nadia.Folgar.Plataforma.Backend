import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AI_EXTRACTION_PORT, AiExtractionPort } from './ports/ai-extraction.port';
import {
  EstadoExtracto,
  ExtractoBancario,
  ExtractoBancarioDocument,
  MovimientoExtracto,
} from './schemas/extracto-bancario.schema';
import { CreateExtractoDto } from './dto/create-extracto.dto';
import { MovimientoDto } from './dto/movimiento.dto';
import { QueryExtractoDto } from './dto/query-extracto.dto';
import { PaginatedResult } from '../common/dto/pagination-query.dto';

/** Subtotal de movimientos agrupados por concepto (checklist FOLGAR-008: "agrupa en subtotales por concepto"). */
export type SubtotalesPorConcepto = Record<string, number>;

/**
 * Orquesta la carga y el procesamiento de extractos bancarios. Depende del
 * contrato `AiExtractionPort` (inyectado vía el token `AI_EXTRACTION_PORT`,
 * nunca de una clase concreta) para que el adapter real se pueda intercambiar
 * el día que se confirme un proveedor de IA, sin tocar este service.
 *
 * El procesamiento es síncrono (no hay cola/worker real todavía — ver nota de
 * scope en `extractos-ia.module.ts`): `cargarExtracto` crea el registro en
 * 'procesando', invoca al puerto y persiste el resultado final ('procesado' o
 * 'error') en la misma llamada.
 */
@Injectable()
export class ExtractosIaService {
  private readonly logger = new Logger(ExtractosIaService.name);

  constructor(
    @Inject(AI_EXTRACTION_PORT) private readonly aiExtractionPort: AiExtractionPort,
    @InjectModel(ExtractoBancario.name)
    private readonly extractoModel: Model<ExtractoBancarioDocument>,
  ) {}

  async cargarExtracto(
    dto: CreateExtractoDto,
    estudioId: Types.ObjectId,
  ): Promise<ExtractoBancarioDocument> {
    const extracto = await this.extractoModel.create({
      clienteId: new Types.ObjectId(dto.clienteId),
      nombreArchivo: dto.nombreArchivo,
      estado: EstadoExtracto.PROCESANDO,
      movimientos: [],
      estudioId,
    });

    try {
      const resultado = await this.aiExtractionPort.extraerMovimientos({
        nombreArchivo: dto.nombreArchivo,
        contenidoBase64: dto.contenidoBase64,
      });

      if (resultado.exitoso) {
        extracto.estado = EstadoExtracto.PROCESADO;
        extracto.movimientos = resultado.movimientos as unknown as MovimientoExtracto[];
        extracto.mensajeError = undefined;
      } else {
        extracto.estado = EstadoExtracto.ERROR;
        extracto.mensajeError = resultado.mensaje ?? 'No se pudo procesar el extracto.';
      }
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : 'Error desconocido al procesar el extracto';
      this.logger.error(`Falló la extracción IA para "${dto.nombreArchivo}": ${mensaje}`);
      extracto.estado = EstadoExtracto.ERROR;
      extracto.mensajeError = mensaje;
    }

    await extracto.save();
    return extracto;
  }

  async findAll(
    query: QueryExtractoDto,
    estudioId: Types.ObjectId,
  ): Promise<PaginatedResult<ExtractoBancarioDocument>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const filter: FilterQuery<ExtractoBancarioDocument> = { estudioId };

    if (query.clienteId) {
      filter.clienteId = new Types.ObjectId(query.clienteId);
    }

    if (query.estado) {
      filter.estado = query.estado;
    }

    const sort: Record<string, 1 | -1> = query.sortBy
      ? { [query.sortBy]: query.sortDir === 'desc' ? -1 : 1 }
      : { createdAt: -1 };

    const [data, total] = await Promise.all([
      this.extractoModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.extractoModel.countDocuments(filter).exec(),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Detalle completo del extracto para la pantalla de revisión, incluyendo
   * `subtotalesPorConcepto` calculado al vuelo (ver nota de diseño en
   * `schemas/extracto-bancario.schema.ts`: no se persiste para que nunca
   * quede desincronizado de `movimientos` tras una edición manual).
   */
  async findOne(
    id: string,
    estudioId: Types.ObjectId,
  ): Promise<Record<string, unknown> & { subtotalesPorConcepto: SubtotalesPorConcepto }> {
    const extracto = await this.obtenerDocumento(id, estudioId);
    return {
      ...extracto.toObject(),
      subtotalesPorConcepto: this.calcularSubtotalesPorConcepto(extracto.movimientos),
    };
  }

  /**
   * Permite al contador editar los movimientos extraídos antes de usarlos en
   * el asiento contable manual en Catedral (checklist FOLGAR-009: "Tabla de
   * resultados editables antes de confirmar"). Este módulo no escribe en
   * Catedral — solo deja los movimientos listos para que el contador los
   * transcriba o copie.
   */
  async actualizarMovimientos(
    id: string,
    movimientos: MovimientoDto[],
    estudioId: Types.ObjectId,
  ): Promise<Record<string, unknown> & { subtotalesPorConcepto: SubtotalesPorConcepto }> {
    const extracto = await this.obtenerDocumento(id, estudioId);
    extracto.movimientos = movimientos;
    await extracto.save();
    return {
      ...extracto.toObject(),
      subtotalesPorConcepto: this.calcularSubtotalesPorConcepto(extracto.movimientos),
    };
  }

  private async obtenerDocumento(
    id: string,
    estudioId: Types.ObjectId,
  ): Promise<ExtractoBancarioDocument> {
    const extracto = await this.extractoModel.findOne({ _id: id, estudioId }).exec();
    if (!extracto) {
      throw new NotFoundException('Extracto no encontrado');
    }
    return extracto;
  }

  calcularSubtotalesPorConcepto(
    movimientos: { concepto: string; monto: number }[],
  ): SubtotalesPorConcepto {
    return movimientos.reduce<SubtotalesPorConcepto>((acc, mov) => {
      acc[mov.concepto] = (acc[mov.concepto] ?? 0) + mov.monto;
      return acc;
    }, {});
  }
}
