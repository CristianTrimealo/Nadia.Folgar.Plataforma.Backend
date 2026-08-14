import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { baseSchemaOptions } from '../../common/database/base-schema.options';

export type CuentaBancariaDocument = HydratedDocument<CuentaBancaria>;

export enum MonedaCuentaBancaria {
  ARS = 'ARS',
  USD = 'USD',
}

/**
 * Cuenta bancaria de un cliente — un cliente puede tener una o varias
 * (distintos bancos, o varias cuentas en el mismo banco). `cuentaContableId`
 * es la cuenta del plan de cuentas del cliente que representa esta cuenta
 * bancaria en el asiento contable (ej. "116 Banco Santander Río") — por eso
 * es obligatoria: sin ella no hay contrapartida posible al armar el asiento.
 */
@Schema(baseSchemaOptions)
export class CuentaBancaria {
  @Prop({ type: Types.ObjectId, ref: 'Cliente', required: true, index: true })
  clienteId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  banco: string;

  @Prop({ required: true, trim: true })
  alias: string;

  @Prop({ trim: true })
  numeroCuenta?: string;

  @Prop({ type: String, enum: MonedaCuentaBancaria, default: MonedaCuentaBancaria.ARS })
  moneda: MonedaCuentaBancaria;

  @Prop({ type: Types.ObjectId, ref: 'CuentaContable', required: true })
  cuentaContableId: Types.ObjectId;

  @Prop({ default: true })
  activo: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Estudio', required: true, index: true })
  estudioId: Types.ObjectId;
}

export const CuentaBancariaSchema = SchemaFactory.createForClass(CuentaBancaria);
CuentaBancariaSchema.index({ estudioId: 1, clienteId: 1 });
