import { Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Job } from 'bullmq';
import {
  AI_EXTRACTION_PORT,
  AiExtractionPort,
  MovimientoExtraido,
  ReglaClasificacionSugerida,
  ReglaExistenteResumen,
} from './ports/ai-extraction.port';
import { PdfTextExtractorService } from './pdf-text-extractor.service';
import {
  EstadoExtracto,
  ExtractoBancario,
  ExtractoBancarioDocument,
  TipoMovimiento,
  ValidacionSaldo,
} from './schemas/extracto-bancario.schema';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { PlanCuentasService } from '../plan-cuentas/plan-cuentas.service';
import { CuentaContableDocument } from '../plan-cuentas/schemas/cuenta-contable.schema';
import { ReglasClasificacionService } from '../reglas-clasificacion/reglas-clasificacion.service';
import { LadoAsiento } from '../reglas-clasificacion/schemas/regla-clasificacion.schema';
import {
  MovimientoValidable,
  construirMovimientosConValidacion,
  contarDiferencias,
  describirDiferencias,
  determinarEstadoFinal,
} from './validacion-saldo';

export interface ProcesarExtractoJobData {
  extractoId: string;
  estudioId: string;
  userId: string;
  nombreArchivo: string;
  contenidoBase64: string;
}

/**
 * Worker BullMQ que hace el trabajo pesado que antes vivía en
 * `ExtractosIaService.cargarExtracto`: extraer el texto del PDF, llamar al
 * `AiExtractionPort` (con el reintento acotado si hay diferencias de saldo),
 * validar saldos y persistir el resultado final. Corre fuera de la request
 * HTTP que subió el archivo — `ExtractosIaService.cargarExtracto` ya
 * respondió hace rato con el documento en `PROCESANDO`.
 *
 * Además, en la misma llamada de IA (no una aparte — evita re-mandar el
 * texto del PDF y un segundo round-trip) le pide al proveedor que infiera
 * reglas de clasificación para patrones recurrentes que mapeen con confianza
 * a una cuenta YA EXISTENTE del plan de cuentas del cliente (nunca inventa
 * cuentas nuevas). Esas reglas quedan activas de inmediato (procedencia
 * `IA`, prioridad baja — nunca le ganan a una regla manual/aprendida para el
 * mismo movimiento), así el asiento contable del propio extracto recién
 * procesado ya las usa para agrupar. El reintento por diferencia de saldo NO
 * vuelve a pedir este contexto — las reglas sugeridas siempre salen del
 * primer intento exitoso.
 *
 * Al terminar (éxito, `requiere_revision` o error) notifica por WebSocket
 * vía `RealtimeGateway` a la room del estudio dueño del extracto, para que
 * el Frontend actualice la fila sin tener que pollear.
 */
@Processor('extractos-ia')
export class ExtractosIaProcessor extends WorkerHost {
  private readonly logger = new Logger(ExtractosIaProcessor.name);

  constructor(
    @Inject(AI_EXTRACTION_PORT) private readonly aiExtractionPort: AiExtractionPort,
    @InjectModel(ExtractoBancario.name)
    private readonly extractoModel: Model<ExtractoBancarioDocument>,
    private readonly pdfTextExtractor: PdfTextExtractorService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly planCuentasService: PlanCuentasService,
    private readonly reglasClasificacionService: ReglasClasificacionService,
  ) {
    super();
  }

  async process(job: Job<ProcesarExtractoJobData>): Promise<void> {
    const { extractoId, estudioId, userId, nombreArchivo, contenidoBase64 } = job.data;

    const extracto = await this.extractoModel.findById(extractoId).exec();
    if (!extracto) {
      this.logger.warn(`Job descartado: el extracto ${extractoId} ya no existe.`);
      return;
    }

    let reglasSugeridas: ReglaClasificacionSugerida[] = [];
    let cuentasContables: CuentaContableDocument[] = [];

    try {
      const { texto, tieneCapaDeTexto } = await this.pdfTextExtractor.extraer(contenidoBase64);

      if (!tieneCapaDeTexto) {
        extracto.estado = EstadoExtracto.ERROR;
        extracto.mensajeError =
          'PDF sin capa de texto, probablemente escaneado. No se envió a la IA.';
        await extracto.save();
        this.notificar(estudioId, extracto);
        return;
      }

      const estudioObjectId = new Types.ObjectId(estudioId);
      cuentasContables = await this.obtenerCuentasContablesActivas(
        extracto.clienteId,
        estudioObjectId,
      );
      const reglasExistentes = await this.obtenerReglasExistentes(
        extracto.clienteId,
        extracto.cuentaBancariaId,
        estudioObjectId,
        cuentasContables,
      );

      let resultado = await this.aiExtractionPort.extraerMovimientos({
        nombreArchivo,
        texto,
        cuentasContablesDisponibles: cuentasContables.map((c) => ({
          codigo: c.codigo,
          nombre: c.nombre,
          naturaleza: c.naturaleza,
        })),
        reglasExistentes,
      });

      if (!resultado.exitoso) {
        extracto.estado = EstadoExtracto.ERROR;
        extracto.mensajeError = resultado.mensaje ?? 'No se pudo procesar el extracto.';
        await extracto.save();
        this.notificar(estudioId, extracto);
        return;
      }

      // Se captura del primer intento — el reintento (abajo) es solo para
      // corregir filas con diferencia de saldo, no vuelve a pedir contexto
      // de plan de cuentas/reglas ni a inferir reglas de nuevo.
      reglasSugeridas = resultado.reglasSugeridas ?? [];

      let movimientos = construirMovimientosConValidacion(
        this.mapearExtraidos(resultado.movimientos),
        resultado.saldoInicialDeclarado,
      );

      // Reintento acotado (máx. 1): si hay diferencias de saldo, se le pide a
      // la IA que revise solo las filas problemáticas antes de resignarse.
      if (movimientos.some((m) => m.validacionSaldo === ValidacionSaldo.DIFERENCIA)) {
        const reintento = await this.aiExtractionPort.extraerMovimientos({
          nombreArchivo,
          texto,
          pistaRevision: describirDiferencias(movimientos),
        });

        if (reintento.exitoso) {
          const movimientosReintento = construirMovimientosConValidacion(
            this.mapearExtraidos(reintento.movimientos),
            reintento.saldoInicialDeclarado,
          );
          if (contarDiferencias(movimientosReintento) < contarDiferencias(movimientos)) {
            movimientos = movimientosReintento;
            resultado = reintento;
          }
        }
      }

      extracto.movimientos = movimientos;
      extracto.saldoInicialDeclarado = resultado.saldoInicialDeclarado;
      extracto.saldoFinalDeclarado = resultado.saldoFinalDeclarado;
      extracto.estado = determinarEstadoFinal(movimientos, resultado.saldoFinalDeclarado);
      extracto.mensajeError = undefined;
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : 'Error desconocido al procesar el extracto';
      this.logger.error(`Falló la extracción IA para "${nombreArchivo}": ${mensaje}`);
      extracto.estado = EstadoExtracto.ERROR;
      extracto.mensajeError = mensaje;
    }

    await extracto.save();
    await this.crearReglasSugeridas(reglasSugeridas, cuentasContables, extracto, estudioId, userId);
    this.notificar(estudioId, extracto);
  }

  private async obtenerCuentasContablesActivas(
    clienteId: Types.ObjectId,
    estudioId: Types.ObjectId,
  ): Promise<CuentaContableDocument[]> {
    const cuentas = await this.planCuentasService.findAll(
      { clienteId: clienteId.toString(), limit: 100 },
      estudioId,
    );
    return cuentas.data.filter((c) => c.activo);
  }

  /** Reglas ya activas del cliente que aplican a esta cuenta bancaria (propias o sin scope), en el formato liviano que espera el puerto de IA. */
  private async obtenerReglasExistentes(
    clienteId: Types.ObjectId,
    cuentaBancariaId: Types.ObjectId,
    estudioId: Types.ObjectId,
    cuentasContables: CuentaContableDocument[],
  ): Promise<ReglaExistenteResumen[]> {
    const reglas = await this.reglasClasificacionService.findAll(
      { clienteId: clienteId.toString(), activa: true, limit: 100 },
      estudioId,
    );
    const cuentaCodigoPorId = new Map(cuentasContables.map((c) => [c._id.toString(), c.codigo]));

    return reglas.data
      .filter(
        (r) => !r.cuentaBancariaId || r.cuentaBancariaId.toString() === cuentaBancariaId.toString(),
      )
      .map((r) => ({
        patronTexto: r.patronTexto,
        cuentaCodigo: cuentaCodigoPorId.get(r.cuentaContableId.toString()) ?? '',
      }))
      .filter((r) => r.cuentaCodigo);
  }

  /** Crea una `ReglaClasificacion` por cada sugerencia cuyo código de cuenta matchea una cuenta real. Nunca rompe el job por una sugerencia inválida. */
  private async crearReglasSugeridas(
    sugerencias: ReglaClasificacionSugerida[],
    cuentasContables: CuentaContableDocument[],
    extracto: ExtractoBancarioDocument,
    estudioId: string,
    userId: string,
  ): Promise<void> {
    if (sugerencias.length === 0) return;

    const cuentaIdPorCodigo = new Map(cuentasContables.map((c) => [c.codigo, c._id.toString()]));

    for (const sugerencia of sugerencias) {
      const cuentaContableId = cuentaIdPorCodigo.get(sugerencia.cuentaCodigo);
      if (!cuentaContableId) {
        this.logger.warn(
          `Regla sugerida ignorada: código de cuenta "${sugerencia.cuentaCodigo}" no existe para el cliente ${extracto.clienteId.toString()}.`,
        );
        continue;
      }

      try {
        await this.reglasClasificacionService.crearSugeridaPorIa(
          {
            clienteId: extracto.clienteId.toString(),
            cuentaBancariaId: extracto.cuentaBancariaId.toString(),
            conceptoContable: sugerencia.patronTexto,
            cuentaContableId,
            ladoAsiento: sugerencia.ladoAsiento as LadoAsiento,
            patronTexto: sugerencia.patronTexto,
            tipoMovimiento: sugerencia.tipoMovimiento,
          },
          new Types.ObjectId(estudioId),
          new Types.ObjectId(userId),
        );
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'Error desconocido';
        this.logger.warn(
          `No se pudo crear la regla sugerida por IA ("${sugerencia.patronTexto}"): ${mensaje}`,
        );
      }
    }
  }

  private notificar(estudioId: string, extracto: ExtractoBancarioDocument): void {
    this.realtimeGateway.emitToEstudio(estudioId, 'extracto:procesado', {
      extractoId: extracto._id.toString(),
      estado: extracto.estado,
      nombreArchivo: extracto.nombreArchivo,
    });
  }

  private mapearExtraidos(movimientos: MovimientoExtraido[]): MovimientoValidable[] {
    return movimientos.map((m) => ({
      fecha: m.fecha,
      concepto: m.concepto,
      monto: m.monto,
      tipo: m.tipo as TipoMovimiento | undefined,
      numeroComprobante: m.numeroComprobante,
      saldoDeclarado: m.saldoDespues,
    }));
  }
}
