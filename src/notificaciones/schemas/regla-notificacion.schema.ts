import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { baseSchemaOptions } from '../../common/database/base-schema.options';
import { PlantillaNotificacion } from '../templates/notificacion.templates';

export type ReglaNotificacionDocument = HydratedDocument<ReglaNotificacion>;

/** Canal configurado en la regla — 'ambos' dispara un envío por cada canal. */
export enum CanalNotificacion {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  AMBOS = 'ambos',
}

/**
 * Regla configurable que define cuándo se dispara un aviso para un tipo de
 * vencimiento.
 *
 * `offsetDias` es relativo a `Vencimiento.fecha`:
 * - Positivo: dispara el aviso esa cantidad de días ANTES del vencimiento
 *   (anticipación — ej. "avisar 5 días antes del vencimiento de IVA").
 * - Negativo: dispara el aviso esa cantidad de días DESPUÉS del vencimiento
 *   (recordatorio de pago vencido — ej. "día 3 y día 10" de honorarios
 *   impagos se modelan como dos reglas con offsetDias -3 y -10).
 */
@Schema(baseSchemaOptions)
export class ReglaNotificacion {
  @Prop({ required: true, trim: true })
  tipoVencimiento: string;

  @Prop({ required: true, type: Number })
  offsetDias: number;

  @Prop({
    type: String,
    enum: CanalNotificacion,
    required: true,
    default: CanalNotificacion.EMAIL,
  })
  canal: CanalNotificacion;

  @Prop({ type: String, enum: PlantillaNotificacion, required: true })
  plantilla: PlantillaNotificacion;

  @Prop({ default: true })
  activa: boolean;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Estudio', required: true, index: true })
  estudioId: Types.ObjectId;
}

export const ReglaNotificacionSchema = SchemaFactory.createForClass(ReglaNotificacion);
ReglaNotificacionSchema.index({ estudioId: 1, tipoVencimiento: 1, activa: 1 });
