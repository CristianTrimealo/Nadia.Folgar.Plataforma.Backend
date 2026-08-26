import { BadRequestException, Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { ProveedorIA } from '../common/enums/proveedor-ia.enum';

/**
 * Valida una API key contra el proveedor real ANTES de guardarla — el
 * usuario pegó la key a mano (no hay OAuth de por medio, ver nota en
 * `IntegracionesService`), así que confirmar que funciona al toque es lo que
 * hace que el flujo sea confiable. Usa el endpoint más liviano de cada SDK
 * (listar modelos) — no gasta tokens de completion, solo confirma que la key
 * es válida y tiene acceso.
 */
@Injectable()
export class ProveedorIaValidatorService {
  async validar(proveedor: ProveedorIA, apiKey: string): Promise<void> {
    try {
      if (proveedor === ProveedorIA.ANTHROPIC) {
        await new Anthropic({ apiKey }).models.list({ limit: 1 });
        return;
      }
      await new OpenAI({ apiKey }).models.list();
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error desconocido';
      throw new BadRequestException(
        `No se pudo validar la key con ${proveedor === ProveedorIA.ANTHROPIC ? 'Anthropic' : 'OpenAI'}: ${mensaje}`,
      );
    }
  }
}
