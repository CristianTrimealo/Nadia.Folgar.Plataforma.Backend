import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Tope de tamaño del archivo ORIGINAL (antes de codificar en base64) que se
 * acepta por adjunto — mismo criterio y mismo valor que
 * `MAX_DOCUMENTO_BYTES` de portal-clientes (ver la nota de alcance en
 * `tarea-adjunto.schema.ts`): 5 MB alcanza para una imagen, un PDF o una
 * captura de pantalla, pero un video real casi siempre lo va a superar —
 * eso queda documentado como limitación conocida, no resuelto acá.
 */
export const MAX_ADJUNTO_BYTES = 5 * 1024 * 1024;

/** Mismo margen de redondeo que `MAX_BASE64_LENGTH` de `CreateDocumentoDto`. */
const MAX_BASE64_LENGTH = Math.ceil(MAX_ADJUNTO_BYTES / 3) * 4 + 1024;

export class CreateTareaAdjuntoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  contentType: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_BASE64_LENGTH, {
    message: `El adjunto supera el tamaño máximo permitido (${Math.floor(
      MAX_ADJUNTO_BYTES / (1024 * 1024),
    )} MB)`,
  })
  contenidoBase64: string;

  @IsInt()
  @Min(1)
  @Max(MAX_ADJUNTO_BYTES, {
    message: `tamanioBytes no puede superar ${Math.floor(MAX_ADJUNTO_BYTES / (1024 * 1024))} MB`,
  })
  tamanioBytes: number;
}
