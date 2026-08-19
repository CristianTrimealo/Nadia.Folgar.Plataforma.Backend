import { Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job } from 'bullmq';
import {
  AI_EXTRACTION_PORT,
  AiExtractionPort,
  MovimientoExtraido,
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
  ) {
    super();
  }

  async process(job: Job<ProcesarExtractoJobData>): Promise<void> {
    const { extractoId, estudioId, nombreArchivo, contenidoBase64 } = job.data;

    const extracto = await this.extractoModel.findById(extractoId).exec();
    if (!extracto) {
      this.logger.warn(`Job descartado: el extracto ${extractoId} ya no existe.`);
      return;
    }

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

      let resultado = await this.aiExtractionPort.extraerMovimientos({ nombreArchivo, texto });

      if (!resultado.exitoso) {
        extracto.estado = EstadoExtracto.ERROR;
        extracto.mensajeError = resultado.mensaje ?? 'No se pudo procesar el extracto.';
        await extracto.save();
        this.notificar(estudioId, extracto);
        return;
      }

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
    this.notificar(estudioId, extracto);
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
