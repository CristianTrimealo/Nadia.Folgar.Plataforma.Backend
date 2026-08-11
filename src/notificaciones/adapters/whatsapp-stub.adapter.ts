import { Injectable, Logger } from '@nestjs/common';
import { MessagingProvider } from '../ports/messaging-provider.port';

/**
 * STUB — el canal WhatsApp para Folgar se resuelve reutilizando el conector
 * 360dialog del CRM de Novaptix (ver FOLGAR-036), pero todavía no hay
 * credenciales ni número de WhatsApp Business confirmados para este
 * proyecto. Este adapter loguea el envío simulado con el logger de Nest en
 * vez de llamar a la API de 360dialog. Reemplazar por el adapter real
 * cuando esté disponible la integración — sin tocar el puerto ni el resto
 * del dominio.
 */
@Injectable()
export class WhatsappStubAdapter implements MessagingProvider {
  private readonly logger = new Logger(WhatsappStubAdapter.name);

  async sendMessage(to: string, body: string): Promise<void> {
    this.logger.log(`[STUB whatsapp] Envío simulado a "${to}" — cuerpo: ${body}`);
    await Promise.resolve();
  }

  async sendTemplateMessage(
    to: string,
    templateId: string,
    params: Record<string, string>,
  ): Promise<void> {
    this.logger.log(
      `[STUB whatsapp] Envío simulado de plantilla "${templateId}" a "${to}" — params: ${JSON.stringify(params)}`,
    );
    await Promise.resolve();
  }
}
