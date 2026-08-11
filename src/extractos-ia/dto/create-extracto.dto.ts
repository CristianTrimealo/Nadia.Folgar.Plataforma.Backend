import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO de carga del extracto. DECISIÓN DE SCOPE: en vez de upload multipart
 * (que requeriría registrar un plugin de Fastify en `main.ts` — archivo
 * compartido con otro trabajo en paralelo que no debe tocarse), el PDF viaja
 * ya codificado en base64 dentro de un DTO JSON estándar. Quien llama al
 * endpoint (el Frontend) es responsable de convertir el archivo elegido por
 * el usuario a base64 antes de mandarlo (ver `features/extractos-ia/api.ts`).
 */
export class CreateExtractoDto {
  @IsString()
  @IsNotEmpty()
  nombreArchivo: string;

  @IsString()
  @IsNotEmpty()
  contenidoBase64: string;

  @IsMongoId()
  clienteId: string;
}
