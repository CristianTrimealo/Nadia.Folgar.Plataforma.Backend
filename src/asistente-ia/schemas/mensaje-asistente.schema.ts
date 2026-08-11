import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { baseSchemaOptions } from '../../common/database/base-schema.options';

export type MensajeAsistenteDocument = HydratedDocument<MensajeAsistente>;

export enum RolMensaje {
  USUARIO = 'usuario',
  ASISTENTE = 'asistente',
}

@Schema(baseSchemaOptions)
export class MensajeAsistente {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: RolMensaje, required: true })
  rol: RolMensaje;

  @Prop({ required: true })
  contenido: string;

  /** Feedback del usuario sobre una respuesta del asistente (null = sin feedback todavía). */
  @Prop({ type: Boolean, default: null })
  util: boolean | null;

  @Prop({ type: Types.ObjectId, ref: 'Estudio', required: true, index: true })
  estudioId: Types.ObjectId;
}

export const MensajeAsistenteSchema = SchemaFactory.createForClass(MensajeAsistente);
MensajeAsistenteSchema.index({ estudioId: 1, userId: 1, createdAt: 1 });
