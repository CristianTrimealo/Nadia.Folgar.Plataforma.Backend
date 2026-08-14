import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { baseSchemaOptions } from '../../common/database/base-schema.options';

export type CuentaContableDocument = HydratedDocument<CuentaContable>;

export enum NaturalezaCuenta {
  DEUDORA = 'deudora',
  ACREEDORA = 'acreedora',
}

/**
 * Plan de cuentas por cliente, con códigos estilo Catedral (ej. "519 Gastos
 * Bancarios", "211 Proveedores") — cada cliente del estudio tiene su propio
 * plan, no hay un plan de cuentas global compartido, porque en la práctica
 * cada cliente carga sus movimientos en su propia instancia de Catedral con
 * su propia numeración.
 */
@Schema(baseSchemaOptions)
export class CuentaContable {
  @Prop({ type: Types.ObjectId, ref: 'Cliente', required: true, index: true })
  clienteId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  codigo: string;

  @Prop({ required: true, trim: true })
  nombre: string;

  @Prop({ type: String, enum: NaturalezaCuenta, required: true })
  naturaleza: NaturalezaCuenta;

  @Prop({ default: true })
  activo: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Estudio', required: true, index: true })
  estudioId: Types.ObjectId;
}

export const CuentaContableSchema = SchemaFactory.createForClass(CuentaContable);
CuentaContableSchema.index({ estudioId: 1, clienteId: 1, codigo: 1 }, { unique: true });
