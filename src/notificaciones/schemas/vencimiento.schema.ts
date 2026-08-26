import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { baseSchemaOptions } from '../../common/database/base-schema.options';

export type VencimientoDocument = HydratedDocument<Vencimiento>;

export enum VencimientoEstado {
  PENDIENTE = 'pendiente',
  NOTIFICADO = 'notificado',
  VENCIDO = 'vencido',
}

/**
 * Un vencimiento del calendario de un cliente (ej. IVA, Honorarios, ARBA).
 * `tipo` queda como string libre (no un enum cerrado): el estudio suma tipos
 * de obligación con el tiempo sin requerir un deploy. Las reglas de
 * notificación (`ReglaNotificacion.tipoVencimiento`) matchean por este mismo
 * string.
 */
@Schema(baseSchemaOptions)
export class Vencimiento {
  @Prop({ required: true, trim: true })
  tipo: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Cliente', required: true, index: true })
  clienteId: Types.ObjectId;

  @Prop({ required: true })
  fecha: Date;

  @Prop({ type: String, enum: VencimientoEstado, default: VencimientoEstado.PENDIENTE })
  estado: VencimientoEstado;

  @Prop({ trim: true })
  descripcion?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Estudio', required: true, index: true })
  estudioId: Types.ObjectId;
}

export const VencimientoSchema = SchemaFactory.createForClass(Vencimiento);
VencimientoSchema.index({ estudioId: 1, fecha: 1 });
VencimientoSchema.index({ estudioId: 1, estado: 1 });
