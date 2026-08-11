import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../common/database/base-schema.options';

export type EstudioDocument = HydratedDocument<Estudio>;

/**
 * Un "Estudio" es el tenant del sistema (hoy solo existe Folgar). Todo dato
 * propio de un estudio contable (clientes, vencimientos, notificaciones...)
 * referencia un estudioId para no reescribir el modelo si se suma otro estudio.
 */
@Schema(baseSchemaOptions)
export class Estudio {
  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true, unique: true })
  cuit: string;

  @Prop({ default: true })
  activo: boolean;

  /** Paleta/branding del estudio — placeholder hasta el Manual de Marca (FOLGAR-013 a 017). */
  @Prop({ type: Object, default: {} })
  branding: Record<string, unknown>;
}

export const EstudioSchema = SchemaFactory.createForClass(Estudio);
