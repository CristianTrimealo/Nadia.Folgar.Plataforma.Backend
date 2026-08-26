import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages/messages';
import {
  AiChatCredenciales,
  AiChatPort,
  MensajeHistorial,
  RespuestaAsistente,
} from '../ports/ai-chat.port';

const MODELO_ANTHROPIC = 'claude-sonnet-5';
const MAX_TOKENS_RESPUESTA = 4096;

const PROMPT_SISTEMA =
  'Sos el Asistente IA institucional de un estudio contable en Buenos Aires. Respondés ' +
  'preguntas del equipo interno sobre el uso de la plataforma y temas contables/impositivos ' +
  'generales de Argentina. Respondé en español rioplatense, de forma breve y concreta. Si no ' +
  'tenés información suficiente para responder con certeza, decilo en vez de inventar un dato.';

/**
 * Adapter real de `AiChatPort` usando Claude Sonnet 5 (Anthropic), sin salida
 * estructurada (a diferencia de `AnthropicExtractionAdapter` — acá la
 * respuesta es texto libre para mostrar en el chat). Seleccionado
 * dinámicamente por `AsistenteIaService` vía `AiProviderResolverService`
 * (Configuración → Integraciones).
 *
 * `thinking: { type: 'disabled' }` por el mismo motivo que en
 * `AnthropicExtractionAdapter`: una respuesta de chat no se beneficia de
 * razonar y el pensamiento se factura igual que la salida.
 */
@Injectable()
export class AnthropicChatAdapter implements AiChatPort {
  private readonly logger = new Logger(AnthropicChatAdapter.name);
  private readonly client: Anthropic;

  constructor(configService: ConfigService) {
    this.client = new Anthropic({ apiKey: configService.get<string>('ANTHROPIC_API_KEY') });
  }

  async responder(
    pregunta: string,
    historial: MensajeHistorial[],
    credenciales?: AiChatCredenciales,
  ): Promise<RespuestaAsistente> {
    const client = credenciales?.apiKey
      ? new Anthropic({ apiKey: credenciales.apiKey })
      : this.client;
    const modelo = credenciales?.modelo ?? MODELO_ANTHROPIC;

    // Tipo de retorno explícito en vez de `as` sobre el ternario — `no-unnecessary-type-assertion`
    // del linter llega a considerar innecesario un `as` puntual acá y lo saca con --fix,
    // reintroduciendo el error de tipos contra `MessageParam` de la SDK.
    const historialMensajes = historial.map((m): MessageParam => ({
      role: m.rol === 'usuario' ? 'user' : 'assistant',
      content: m.contenido,
    }));
    const mensajes: MessageParam[] = [...historialMensajes, { role: 'user', content: pregunta }];

    try {
      const respuesta = await client.messages.create({
        model: modelo,
        max_tokens: MAX_TOKENS_RESPUESTA,
        system: PROMPT_SISTEMA,
        thinking: { type: 'disabled' },
        messages: mensajes,
      });

      const bloqueTexto = respuesta.content.find((bloque) => bloque.type === 'text');
      if (!bloqueTexto || bloqueTexto.type !== 'text') {
        return {
          respuesta: 'No pude generar una respuesta esta vez. Probá reformular la pregunta.',
        };
      }

      return { respuesta: bloqueTexto.text };
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : 'Error desconocido al llamar al proveedor de IA';
      this.logger.error(`Falló la respuesta del Asistente IA con Anthropic: ${mensaje}`);
      return {
        respuesta:
          'Ocurrió un error al consultar al Asistente IA. Intentá de nuevo en unos minutos.',
      };
    }
  }
}
