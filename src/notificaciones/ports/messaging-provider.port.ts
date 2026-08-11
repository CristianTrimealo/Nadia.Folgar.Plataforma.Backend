/**
 * Puerto de mensajería (arquitectura hexagonal liviana) — toda integración de
 * envío de avisos (email, WhatsApp, y a futuro otros canales) implementa esta
 * interfaz, nunca se acopla el service de dominio a un SDK concreto. Imita el
 * patrón `MessagingProvider` del CRM de Novaptix
 * (src/modules/messaging/domain/messagingProvider.js), portado a TypeScript
 * y simplificado al par de métodos que necesita el motor de notificaciones.
 */
export interface MessagingProvider {
  /** Envía un mensaje de texto libre al destinatario indicado. */
  sendMessage(to: string, body: string): Promise<void>;

  /** Envía un mensaje basado en una plantilla predefinida del canal (ej. plantilla aprobada de WhatsApp Business). */
  sendTemplateMessage(
    to: string,
    templateId: string,
    params: Record<string, string>,
  ): Promise<void>;
}

/** Token de inyección de dependencias para el puerto `MessagingProvider`. */
export const MESSAGING_PROVIDER = Symbol('MESSAGING_PROVIDER');
