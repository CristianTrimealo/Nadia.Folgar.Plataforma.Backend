import { Injectable, Logger } from '@nestjs/common';
import { AiChatPort, MensajeHistorial, RespuestaAsistente } from '../ports/ai-chat.port';

/**
 * STUB — no llama a ningún proveedor de IA real. Devuelve una respuesta fija
 * indicando que el asistente todavía no está conectado a un proveedor real.
 * Reemplazar por un adapter concreto (OpenAI/Anthropic/lo que se confirme)
 * cuando el estudio y Novaptix definan la base de conocimiento (FOLGAR-059)
 * y el proveedor (FOLGAR-060).
 */
@Injectable()
export class AiChatStubAdapter implements AiChatPort {
  private readonly logger = new Logger(AiChatStubAdapter.name);

  /** No usa `credenciales` — el stub nunca llama a ningún proveedor real. */
  async responder(pregunta: string, historial: MensajeHistorial[]): Promise<RespuestaAsistente> {
    this.logger.warn(
      `[STUB] Pregunta recibida ("${pregunta}") con ${historial.length} mensaje(s) de historial — ` +
        'no hay proveedor de IA real conectado todavía.',
    );

    return Promise.resolve({
      respuesta:
        'El Asistente IA todavía no está conectado a un proveedor real (ver FOLGAR-059/060 en el ' +
        'backlog). Esta es una respuesta simulada para poder probar el flujo de chat.',
    });
  }
}
