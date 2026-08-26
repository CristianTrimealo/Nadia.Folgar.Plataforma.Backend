/**
 * Puerto del Asistente IA institucional (patrón puerto/adapter — ver ADR #5
 * en CLAUDE.md). El proveedor se resuelve dinámicamente por
 * `AiProviderResolverService` (Configuración → Integraciones, con fallback a
 * `AI_PROVIDER` de entorno) — sin ninguna integración conectada, se usa el
 * adapter stub (`adapters/ai-chat-stub.adapter.ts`).
 */
export interface MensajeHistorial {
  rol: 'usuario' | 'asistente';
  contenido: string;
}

export interface RespuestaAsistente {
  respuesta: string;
}

/** Credencial resuelta por `AiProviderResolverService` para esta llamada puntual — ver `AiCredenciales` en `extractos-ia/ports/ai-extraction.port.ts` (mismo shape, puerto distinto). */
export interface AiChatCredenciales {
  apiKey?: string;
  modelo?: string;
}

export interface AiChatPort {
  responder(
    pregunta: string,
    historial: MensajeHistorial[],
    credenciales?: AiChatCredenciales,
  ): Promise<RespuestaAsistente>;
}

export const AI_CHAT_PORT = Symbol('AI_CHAT_PORT');
