import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Tope de tamaño de la foto de perfil ORIGINAL (antes de base64) — mismo criterio
 * que `MAX_DOCUMENTO_BYTES` en portal-clientes: se guarda base64 directo en Mongo
 * mientras no haya storage de objetos real (ver la nota en `user.schema.ts`).
 *
 * Pedido explícito: "no debe tener límite". No hay forma de que sea literalmente
 * ilimitado con este storage — Mongo tiene un tope duro de 16 MB por documento, y
 * la foto va codificada en base64 (~+33%) dentro del mismo documento de User. Con
 * 10 MB de foto original el base64 da ~13.3 MB, con margen de sobra bajo ese
 * límite — muy por encima de lo que produce cualquier cámara/celular en una sola
 * foto, así que en la práctica es "sin límite" para este caso de uso.
 */
export const MAX_AVATAR_BYTES = 10 * 1024 * 1024;

const MAX_AVATAR_BASE64_LENGTH = Math.ceil(MAX_AVATAR_BYTES / 3) * 4 + 1024;

export class UpdateAvatarDto {
  @IsString()
  @IsNotEmpty()
  contentType: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_AVATAR_BASE64_LENGTH, {
    message: `La foto supera el tamaño máximo permitido (${Math.floor(
      MAX_AVATAR_BYTES / (1024 * 1024),
    )} MB)`,
  })
  contenidoBase64: string;

  @IsInt()
  @Min(1)
  @Max(MAX_AVATAR_BYTES, {
    message: `tamanioBytes no puede superar ${Math.floor(MAX_AVATAR_BYTES / (1024 * 1024))} MB`,
  })
  tamanioBytes: number;
}
