import { Injectable, Logger } from '@nestjs/common';
import { MessagingProvider } from '../ports/messaging-provider.port';

/**
 * STUB — todavía no hay proveedor de mail ni credenciales confirmadas para
 * Folgar. En vez de integrar contra un servicio real, este adapter loguea el
 * envío simulado con el logger de Nest. Reemplazar por una integración real
 * (ej. SMTP vía nodemailer, o un proveedor transaccional) cuando el estudio
 * confirme la vía de acceso — sin tocar el puerto ni el resto del dominio.
 */
@Injectable()
export class EmailAdapter implements MessagingProvider {
  private readonly logger = new Logger(EmailAdapter.name);

  async sendMessage(to: string, body: string): Promise<void> {
    this.logger.log(`[STUB email] Envío simulado a "${to}" — cuerpo: ${body}`);
    await Promise.resolve();
  }

  async sendTemplateMessage(
    to: string,
    templateId: string,
    params: Record<string, string>,
  ): Promise<void> {
    this.logger.log(
      `[STUB email] Envío simulado de plantilla "${templateId}" a "${to}" — params: ${JSON.stringify(params)}`,
    );
    await Promise.resolve();
  }
}
