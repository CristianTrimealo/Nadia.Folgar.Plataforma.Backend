import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  AiChatCredenciales,
  AiChatPort,
  MensajeHistorial,
  RespuestaAsistente,
} from '../ports/ai-chat.port';

const MAX_TOKENS_RESPUESTA = 4096;

const PROMPT_SISTEMA =
  'Sos el Asistente IA institucional de un estudio contable en Buenos Aires. Respondés ' +
  'preguntas del equipo interno sobre el uso de la plataforma y temas contables/impositivos ' +
  'generales de Argentina. Respondé en español rioplatense, de forma breve y concreta. Si no ' +
  'tenés información suficiente para responder con certeza, decilo en vez de inventar un dato.';

/**
 * Adapter alternativo de `AiChatPort` usando OpenAI (GPT-5.1 por default,
 * configurable con `OPENAI_MODEL`), sin salida estructurada — mismo contrato
 * que `AnthropicChatAdapter`, solo cambia el proveedor. Seleccionado
 * dinámicamente por `AsistenteIaService` vía `AiProviderResolverService`
 * (Configuración → Integraciones).
 */
@Injectable()
export class OpenAiChatAdapter implements AiChatPort {
  private readonly logger = new Logger(OpenAiChatAdapter.name);
  private readonly client: OpenAI;
  private readonly modelo: string;

  constructor(configService: ConfigService) {
    this.client = new OpenAI({ apiKey: configService.get<string>('OPENAI_API_KEY') });
    this.modelo = configService.get<string>('OPENAI_MODEL') ?? 'gpt-5.1';
  }

  async responder(
    pregunta: string,
    historial: MensajeHistorial[],
    credenciales?: AiChatCredenciales,
  ): Promise<RespuestaAsistente> {
    const client = credenciales?.apiKey ? new OpenAI({ apiKey: credenciales.apiKey }) : this.client;
    const modelo = credenciales?.modelo ?? this.modelo;

    try {
      const completion = await client.chat.completions.create({
        model: modelo,
        max_completion_tokens: MAX_TOKENS_RESPUESTA,
        messages: [
          { role: 'system', content: PROMPT_SISTEMA },
          ...historial.map((m) => ({
            role: m.rol === 'usuario' ? 'user' : 'assistant',
            content: m.contenido,
          })),
          { role: 'user' as const, content: pregunta },
        ],
      });

      const contenido = completion.choices[0]?.message?.content;
      if (!contenido) {
        return {
          respuesta: 'No pude generar una respuesta esta vez. Probá reformular la pregunta.',
        };
      }

      return { respuesta: contenido };
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : 'Error desconocido al llamar al proveedor de IA';
      this.logger.error(`Falló la respuesta del Asistente IA con OpenAI: ${mensaje}`);
      return {
        respuesta:
          'Ocurrió un error al consultar al Asistente IA. Intentá de nuevo en unos minutos.',
      };
    }
  }
}
