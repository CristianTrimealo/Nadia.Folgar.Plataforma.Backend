import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { baseSchemaOptions } from '../../common/database/base-schema.options';

export type TareaAdjuntoDocument = HydratedDocument<TareaAdjunto>;

/**
 * Adjunto de una tarjeta del tablero (imagen, PDF, video, lo que sea) —
 * mismo criterio de alcance que `Documento` de portal-clientes: todavía no
 * hay una solución de storage de objetos confirmada (S3/Blob Storage, tarea
 * del módulo "Despliegue e Infraestructura", FOLGAR-073 a 077), así que el
 * contenido se guarda como base64 directo en Mongo. Colección propia (no un
 * array embebido en `TareaPresentacion`) por la misma razón que `Documento`
 * es su propia colección en vez de vivir embebida en `Cliente`: un documento
 * de Mongo tiene un tope de 16 MB, y con varios adjuntos por tarjeta a lo
 * largo del tiempo un array embebido lo alcanzaría tarde o temprano — acá
 * cada adjunto es su propio documento, sin ese techo compartido.
 *
 * NO escala más allá de un piloto — en particular, un archivo de video real
 * casi siempre va a superar `MAX_ADJUNTO_BYTES` (ver el DTO de alta) mucho
 * antes que una imagen o un PDF corto. Reemplazar por un adapter de storage
 * real (este documento pasaría a guardar solo una key/URL, no el contenido)
 * apenas se confirme el proveedor, sin tocar el resto del dominio del
 * módulo — mismo patrón puerto/adapter que `MessagingProvider`.
 */
@Schema(baseSchemaOptions)
export class TareaAdjunto {
  @Prop({ type: Types.ObjectId, ref: 'TareaPresentacion', required: true, index: true })
  tareaId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  nombre: string;

  @Prop({ required: true })
  contentType: string;

  /** Contenido del archivo codificado en base64 — ver nota de alcance arriba. */
  @Prop({ required: true })
  contenidoBase64: string;

  @Prop({ required: true, min: 0 })
  tamanioBytes: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  subidoPor?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Estudio', required: true, index: true })
  estudioId: Types.ObjectId;
}

export const TareaAdjuntoSchema = SchemaFactory.createForClass(TareaAdjunto);
TareaAdjuntoSchema.index({ estudioId: 1, tareaId: 1 });
