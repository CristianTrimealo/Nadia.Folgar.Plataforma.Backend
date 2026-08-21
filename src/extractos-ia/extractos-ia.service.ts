import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { PdfTextExtractorService } from './pdf-text-extractor.service';
import {
  EstadoExtracto,
  ExtractoBancario,
  ExtractoBancarioDocument,
} from './schemas/extracto-bancario.schema';
import { CreateExtractoDto } from './dto/create-extracto.dto';
import { MovimientoDto } from './dto/movimiento.dto';
import { QueryExtractoDto } from './dto/query-extracto.dto';
import { AnalizarExtractoDto } from './dto/analizar-extracto.dto';
import { UpdateExtractoDto } from './dto/update-extracto.dto';
import { PaginatedResult } from '../common/dto/pagination-query.dto';
import { CuentasBancariasService } from '../cuentas-bancarias/cuentas-bancarias.service';
import { ExtractoDeteccionService } from './extracto-deteccion.service';
import { ProcesarExtractoJobData } from './extractos-ia.processor';
import { construirMovimientosConValidacion, determinarEstadoFinal } from './validacion-saldo';

export interface ExtractosProcessingQueue {
  add(name: 'procesar', data: ProcesarExtractoJobData): Promise<unknown>;
}

export const EXTRACTOS_PROCESSING_QUEUE = Symbol('EXTRACTOS_PROCESSING_QUEUE');

/**
 * Resultado del análisis previo a la carga (`POST /extractos-ia/analizar`):
 * ayuda a pre-completar cliente y período ANTES de que el contador tenga que
 * elegirlos, sin persistir nada — es un análisis stateless del PDF.
 */
export interface AnalisisExtractoResultado {
  tieneCapaDeTexto: boolean;
  cuitDetectado?: string;
  periodoDetectado?: string;
}

/** Subtotal de movimientos agrupados por concepto (checklist FOLGAR-008: "agrupa en subtotales por concepto"). */
export type SubtotalesPorConcepto = Record<string, number>;

/**
 * Orquesta la carga de extractos bancarios y las lecturas/ediciones sobre
 * ellos. El procesamiento pesado (extracción de texto + IA + validación de
 * saldo) NO vive acá — `cargarExtracto` solo valida, crea el documento en
 * `PROCESANDO` y encola un job en la cola `extractos-ia` (BullMQ/Redis);
 * `ExtractosIaProcessor` es quien lo procesa de forma asíncrona y notifica
 * el resultado por WebSocket (`RealtimeGateway`) cuando termina. Antes este
 * método hacía todo eso de forma síncrona dentro de la misma request HTTP —
 * dejó de alcanzar en cuanto empezaron a llegar extractos reales que
 * superaban el timeout HTTP del Frontend.
 */
@Injectable()
export class ExtractosIaService {
  constructor(
    @InjectModel(ExtractoBancario.name)
    private readonly extractoModel: Model<ExtractoBancarioDocument>,
    private readonly pdfTextExtractor: PdfTextExtractorService,
    private readonly cuentasBancariasService: CuentasBancariasService,
    private readonly extractoDeteccionService: ExtractoDeteccionService,
    @Inject(EXTRACTOS_PROCESSING_QUEUE)
    private readonly extractosQueue: ExtractosProcessingQueue,
  ) {}

  /**
   * Análisis previo a la carga: extrae el texto del PDF (determinístico, sin
   * IA) y detecta CUIT/período por regex (`ExtractoDeteccionService`) para
   * que el Frontend pueda pre-completar cliente y período antes de que el
   * contador los elija a mano. No persiste nada — si el contador nunca
   * confirma la carga, este análisis no deja rastro.
   */
  async analizarEncabezado(dto: AnalizarExtractoDto): Promise<AnalisisExtractoResultado> {
    const { texto, tieneCapaDeTexto } = await this.pdfTextExtractor.extraer(dto.contenidoBase64);

    if (!tieneCapaDeTexto) {
      return { tieneCapaDeTexto: false };
    }

    const { cuitDetectado, periodoDetectado } = this.extractoDeteccionService.detectar(texto);
    return { tieneCapaDeTexto: true, cuitDetectado, periodoDetectado };
  }

  async cargarExtracto(
    dto: CreateExtractoDto,
    estudioId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ExtractoBancarioDocument> {
    const cuentaBancaria = await this.cuentasBancariasService.findOne(
      dto.cuentaBancariaId,
      estudioId,
    );
    if (cuentaBancaria.clienteId.toString() !== dto.clienteId) {
      throw new BadRequestException('La cuenta bancaria debe pertenecer al cliente indicado');
    }

    const extracto = await this.extractoModel.create({
      clienteId: new Types.ObjectId(dto.clienteId),
      cuentaBancariaId: new Types.ObjectId(dto.cuentaBancariaId),
      periodo: dto.periodo,
      nombreArchivo: dto.nombreArchivo,
      estado: EstadoExtracto.PROCESANDO,
      movimientos: [],
      estudioId,
    });

    await this.extractosQueue.add('procesar', {
      extractoId: extracto._id.toString(),
      estudioId: estudioId.toString(),
      userId: userId.toString(),
      nombreArchivo: dto.nombreArchivo,
      contenidoBase64: dto.contenidoBase64,
    });

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

    if (query.cuentaBancariaId) {
      filter.cuentaBancariaId = new Types.ObjectId(query.cuentaBancariaId);
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
   *
   * Cada edición dispara una re-validación de saldo completa contra
   * `saldoInicialDeclarado` del extracto: si la corrección del contador
   * resuelve la diferencia, el extracto vuelve a `PROCESADO` solo; si no, se
   * mantiene (o pasa a) `REQUIERE_REVISION`.
   */
  async actualizarMovimientos(
    id: string,
    movimientosDto: MovimientoDto[],
    estudioId: Types.ObjectId,
  ): Promise<Record<string, unknown> & { subtotalesPorConcepto: SubtotalesPorConcepto }> {
    const extracto = await this.obtenerDocumento(id, estudioId);
    const movimientos = construirMovimientosConValidacion(
      movimientosDto,
      extracto.saldoInicialDeclarado,
    );
    extracto.movimientos = movimientos;

    if (extracto.estado !== EstadoExtracto.ERROR) {
      extracto.estado = determinarEstadoFinal(movimientos, extracto.saldoFinalDeclarado);
    }

    await extracto.save();
    return {
      ...extracto.toObject(),
      subtotalesPorConcepto: this.calcularSubtotalesPorConcepto(extracto.movimientos),
    };
  }

  /**
   * Corrige el cliente y/o la cuenta bancaria de un extracto ya cargado (p.
   * ej. se procesó contra el cliente equivocado). No reprocesa el PDF ni
   * toca `movimientos` — solo repite la misma validación de pertenencia de
   * `cargarExtracto` con los valores finales (nuevos o los que ya tenía).
   */
  async actualizarDatos(
    id: string,
    dto: UpdateExtractoDto,
    estudioId: Types.ObjectId,
  ): Promise<Record<string, unknown> & { subtotalesPorConcepto: SubtotalesPorConcepto }> {
    const extracto = await this.obtenerDocumento(id, estudioId);

    if (dto.clienteId || dto.cuentaBancariaId) {
      const clienteId = dto.clienteId ?? extracto.clienteId.toString();
      const cuentaBancariaId = dto.cuentaBancariaId ?? extracto.cuentaBancariaId.toString();

      const cuentaBancaria = await this.cuentasBancariasService.findOne(
        cuentaBancariaId,
        estudioId,
      );
      if (cuentaBancaria.clienteId.toString() !== clienteId) {
        throw new BadRequestException('La cuenta bancaria debe pertenecer al cliente indicado');
      }

      extracto.clienteId = new Types.ObjectId(clienteId);
      extracto.cuentaBancariaId = new Types.ObjectId(cuentaBancariaId);
      await extracto.save();
    }

    return {
      ...extracto.toObject(),
      subtotalesPorConcepto: this.calcularSubtotalesPorConcepto(extracto.movimientos),
    };
  }

  /** Elimina un extracto ya cargado (p. ej. duplicado o subido por error). No hay soft-delete: no queda rastro para reprocesar. */
  async eliminar(id: string, estudioId: Types.ObjectId): Promise<void> {
    const extracto = await this.obtenerDocumento(id, estudioId);
    await extracto.deleteOne();
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
