import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { baseSchemaOptions } from '../../common/database/base-schema.options';

export type NotificacionEnviadaDocument = HydratedDocument<NotificacionEnviada>;

/** Canal concreto de un envío ya realizado (a diferencia de ReglaNotificacion.canal, nunca es 'ambos'). */
export enum CanalEnvio {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
}

export enum EstadoEnvio {
  ENVIADO = 'enviado',
  ERROR = 'error',
}

/**
 * Log de auditoría de cada intento de envío. Es también la fuente de verdad
 * para evitar avisos duplicados: antes de enviar, `evaluarReglas()` chequea
 * si ya existe un registro para la combinación regla + vencimiento + día.
 */
@Schema(baseSchemaOptions)
export class NotificacionEnviada {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Vencimiento', required: true, index: true })
  vencimientoId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'ReglaNotificacion', required: true, index: true })
  reglaId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Cliente', required: true, index: true })
  clienteId: Types.ObjectId;

  @Prop({ type: String, enum: CanalEnvio, required: true })
  canal: CanalEnvio;

  @Prop({ required: true })
  fechaEnvio: Date;

  @Prop({ type: String, enum: EstadoEnvio, required: true })
  estado: EstadoEnvio;

  @Prop({ trim: true })
  detalleError?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Estudio', required: true, index: true })
  estudioId: Types.ObjectId;
}

export const NotificacionEnviadaSchema = SchemaFactory.createForClass(NotificacionEnviada);
NotificacionEnviadaSchema.index({ reglaId: 1, vencimientoId: 1, fechaEnvio: 1 });
