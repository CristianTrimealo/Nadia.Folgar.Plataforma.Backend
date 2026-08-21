import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import {
  AiTareasDocumentoInput,
  AiTareasDocumentoPort,
  AnalisisTareasResultado,
  TareaPropuestaIA,
} from '../ports/ai-tareas-documento.port';
import {
  AnalisisTareasSchema,
  PROMPT_SISTEMA_TAREAS,
  construirMensajeUsuarioTareas,
} from './shared/tareas-documento.schema';

const MODELO_ANTHROPIC = 'claude-sonnet-5';
/** Briefs/propuestas de servicio son bastante más cortos que un extracto bancario con cientos de movimientos. */
const MAX_TOKENS_RESPUESTA = 16000;

/**
 * Adapter real de `AiTareasDocumentoPort` usando Claude Sonnet 5 (Anthropic)
 * con salida estructurada (`output_config.format` + `zodOutputFormat`), sobre
 * el TEXTO ya extraído del documento (nunca el binario — ver
 * `DocumentoTextoExtractorService`). Schema/prompt compartidos con
 * `OpenAiTareasDocumentoAdapter` en `./shared/tareas-documento.schema.ts`.
 *
 * `thinking: { type: 'disabled' }`: igual que `AnthropicExtractionAdapter`,
 * para que la respuesta sea rápida — el pedido explícito de "Generar tareas
 * del mes" es que el análisis corra lo más rápido posible, y esta tarea
 * (leer un documento y organizarlo en una lista) no se beneficia de
 * razonar con presupuesto extra de `thinking`.
 *
 * Seleccionado vía `AI_PROVIDER=anthropic` en `iva-tareas.module.ts`.
 */
@Injectable()
export class AnthropicTareasDocumentoAdapter implements AiTareasDocumentoPort {
  private readonly logger = new Logger(AnthropicTareasDocumentoAdapter.name);
  private readonly client: Anthropic;

  constructor(configService: ConfigService) {
    this.client = new Anthropic({ apiKey: configService.get<string>('ANTHROPIC_API_KEY') });
  }

  async analizarDocumento(input: AiTareasDocumentoInput): Promise<AnalisisTareasResultado> {
    try {
      const stream = this.client.messages.stream({
        model: MODELO_ANTHROPIC,
        max_tokens: MAX_TOKENS_RESPUESTA,
        system: PROMPT_SISTEMA_TAREAS,
        messages: [{ role: 'user', content: construirMensajeUsuarioTareas(input) }],
        thinking: { type: 'disabled' },
        output_config: { format: zodOutputFormat(AnalisisTareasSchema) },
      });

      const respuesta = await stream.finalMessage();

      if (respuesta.stop_reason === 'refusal') {
        return {
          exitoso: false,
          tareas: [],
          mensaje: 'El proveedor de IA rechazó procesar este documento.',
        };
      }

      if (!respuesta.parsed_output) {
        return {
          exitoso: false,
          tareas: [],
          mensaje: `La IA no devolvió un resultado estructurado válido (stop_reason: ${respuesta.stop_reason}).`,
        };
      }

      const tareas: TareaPropuestaIA[] = respuesta.parsed_output.tareas.map((t) => ({
        titulo: t.titulo,
        descripcion: t.descripcion,
        checklist: t.checklist,
      }));

      return {
        exitoso: true,
        tareas,
        mensaje: `Propuestas ${tareas.length} tareas con Claude Sonnet 5.`,
      };
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : 'Error desconocido al llamar al proveedor de IA';
      this.logger.error(
        `Falló el análisis con Anthropic para "${input.nombreArchivo}": ${mensaje}`,
      );
      return { exitoso: false, tareas: [], mensaje };
    }
  }
}
