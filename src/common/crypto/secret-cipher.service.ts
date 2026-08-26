import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITMO = 'aes-256-gcm';
const LONGITUD_IV = 12;

/**
 * Cifrado simétrico de secretos que hay que poder leer de vuelta (a
 * diferencia de una password, que se hashea y nunca se descifra) — primer
 * uso: las API keys de IA que el estudio conecta en Configuración →
 * Integraciones (`IntegracionIa.apiKeyCifrada`). Pensado para reusarse con
 * cualquier otro secreto futuro (tokens de WhatsApp, etc. — hoy esos siguen
 * en adapters stub).
 *
 * AES-256-GCM con Node `crypto` nativo, sin dependencias nuevas. La clave
 * sale de `SECRETS_ENCRYPTION_KEY` (32 bytes en base64, validada en
 * `env.validation.ts` — el bootstrap falla explícitamente si falta, igual
 * que ya hace con `JWT_SECRET`). Cada cifrado usa un IV al azar propio
 * (nunca reusado) y guarda `iv:authTag:ciphertext` en un solo string, todo
 * en base64 — así no hace falta una columna aparte por cada parte.
 */
@Injectable()
export class SecretCipherService {
  private readonly key: Buffer;

  constructor(configService: ConfigService) {
    const claveBase64 = configService.get<string>('SECRETS_ENCRYPTION_KEY') as string;
    this.key = Buffer.from(claveBase64, 'base64');
  }

  encrypt(texto: string): string {
    const iv = randomBytes(LONGITUD_IV);
    const cipher = createCipheriv(ALGORITMO, this.key, iv);
    const cifrado = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv, authTag, cifrado].map((parte) => parte.toString('base64')).join(':');
  }

  decrypt(valor: string): string {
    const [ivB64, authTagB64, cifradoB64] = valor.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const cifrado = Buffer.from(cifradoB64, 'base64');

    const decipher = createDecipheriv(ALGORITMO, this.key, iv);
    decipher.setAuthTag(authTag);
    const descifrado = Buffer.concat([decipher.update(cifrado), decipher.final()]);
    return descifrado.toString('utf8');
  }
}
