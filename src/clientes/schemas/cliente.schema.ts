import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { baseSchemaOptions } from '../../common/database/base-schema.options';

export type ClienteDocument = HydratedDocument<Cliente>;

export enum RegimenFiscal {
  RESPONSABLE_INSCRIPTO = 'responsable_inscripto',
  MONOTRIBUTO = 'monotributo',
  EXENTO = 'exento',
}

@Schema(baseSchemaOptions)
export class Cliente {
  @Prop({ required: true, trim: true })
  nombre: string;

  @Prop({ required: true, unique: true })
  cuit: string;

  @Prop({ trim: true })
  contacto?: string;

  @Prop({ type: String, enum: RegimenFiscal })
  regimenFiscal?: RegimenFiscal;

  @Prop({ trim: true, lowercase: true })
  email?: string;

  @Prop()
  telefono?: string;

  @Prop({ trim: true })
  responsable?: string;

  /**
   * Miembro de "Personal" (equipo interno, `users/`) asignado como
   * responsable de este cliente — a diferencia de `responsable` (texto
   * libre, arriba), esto es una referencia real: quien tenga este ID
   * asignado ve este cliente en su fila de la pantalla Personal del
   * Frontend, y comparte el tablero de tareas de este cliente con él.
   */
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  responsableId?: Types.ObjectId;

  @Prop({ default: true })
  activo: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Estudio', required: true, index: true })
  estudioId: Types.ObjectId;
}

export const ClienteSchema = SchemaFactory.createForClass(Cliente);
ClienteSchema.index({ estudioId: 1, nombre: 1 });
