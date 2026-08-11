/**
 * Puerto del Asistente IA institucional (patrón puerto/adapter — ver ADR #5
 * en CLAUDE.md). No hay proveedor de IA confirmado todavía para este
 * proyecto (ni OpenAI ni Anthropic ni nadie) — el adapter activo hoy es un
 * stub, ver `adapters/ai-chat-stub.adapter.ts`.
 */
export interface MensajeHistorial {
  rol: 'usuario' | 'asistente';
  contenido: string;
}

export interface RespuestaAsistente {
  respuesta: string;
}

export interface AiChatPort {
  responder(pregunta: string, historial: MensajeHistorial[]): Promise<RespuestaAsistente>;
}

export const AI_CHAT_PORT = Symbol('AI_CHAT_PORT');
