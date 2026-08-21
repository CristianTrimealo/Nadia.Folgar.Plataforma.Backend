import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod/v4';
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

const MAX_TOKENS_RESPUESTA = 16000;
type AnalisisTareasParseado = z.infer<typeof AnalisisTareasSchema>;

/**
 * Adapter alternativo de `AiTareasDocumentoPort` usando OpenAI (GPT-5.1 por
 * default, configurable con `OPENAI_MODEL`), con salida estructurada vía
 * `zodResponseFormat` sobre el mismo `AnalisisTareasSchema`/`PROMPT_SISTEMA_TAREAS`
 * que usa `AnthropicTareasDocumentoAdapter` — mismo contrato de entrada/salida,
 * solo cambia el proveedor de IA.
 *
 * Seleccionado vía `AI_PROVIDER=openai` en `iva-tareas.module.ts`.
 */
@Injectable()
export class OpenAiTareasDocumentoAdapter implements AiTareasDocumentoPort {
  private readonly logger = new Logger(OpenAiTareasDocumentoAdapter.name);
  private readonly client: OpenAI;
  private readonly modelo: string;

  constructor(configService: ConfigService) {
    this.client = new OpenAI({ apiKey: configService.get<string>('OPENAI_API_KEY') });
    this.modelo = configService.get<string>('OPENAI_MODEL') ?? 'gpt-5.1';
  }

  async analizarDocumento(input: AiTareasDocumentoInput): Promise<AnalisisTareasResultado> {
    try {
      const completion = await this.client.chat.completions.parse({
        model: this.modelo,
        max_completion_tokens: MAX_TOKENS_RESPUESTA,
        messages: [
          { role: 'system', content: PROMPT_SISTEMA_TAREAS },
          { role: 'user', content: construirMensajeUsuarioTareas(input) },
        ],
        response_format: zodResponseFormat(AnalisisTareasSchema, 'analisis_tareas'),
      });

      const mensaje = completion.choices[0]?.message;

      if (mensaje?.refusal) {
        return {
          exitoso: false,
          tareas: [],
          mensaje: 'El proveedor de IA rechazó procesar este documento.',
        };
      }

      if (!mensaje?.parsed) {
        return {
          exitoso: false,
          tareas: [],
          mensaje: `La IA no devolvió un resultado estructurado válido (finish_reason: ${completion.choices[0]?.finish_reason}).`,
        };
      }

      const resultado = mensaje.parsed as AnalisisTareasParseado;
      const tareas: TareaPropuestaIA[] = resultado.tareas.map((t) => ({
        titulo: t.titulo,
        descripcion: t.descripcion,
        checklist: t.checklist,
      }));

      return {
        exitoso: true,
        tareas,
        mensaje: `Propuestas ${tareas.length} tareas con ${this.modelo}.`,
      };
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : 'Error desconocido al llamar al proveedor de IA';
      this.logger.error(`Falló el análisis con OpenAI para "${input.nombreArchivo}": ${mensaje}`);
      return { exitoso: false, tareas: [], mensaje };
    }
  }
}
