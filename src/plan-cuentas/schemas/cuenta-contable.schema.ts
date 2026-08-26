import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { baseSchemaOptions } from '../../common/database/base-schema.options';

export type CuentaContableDocument = HydratedDocument<CuentaContable>;

export enum NaturalezaCuenta {
  DEUDORA = 'deudora',
  ACREEDORA = 'acreedora',
}

/**
 * Plan de cuentas del estudio, con códigos estilo Catedral (ej. "519 Gastos
 * Bancarios", "211 Proveedores") — compartido entre todos los clientes, no
 * por cliente: corresponde 1:1 al plan de cuentas real de Catedral, y un
 * mismo código puede aplicar a más de un cliente (decisión corregida luego
 * de un análisis forense sobre los Excel reales del estudio — antes este
 * schema asumía, incorrectamente, que cada cliente tenía su propio plan
 * aislado).
 */
@Schema(baseSchemaOptions)
export class CuentaContable {
  @Prop({ required: true, trim: true })
  codigo: string;

  @Prop({ required: true, trim: true })
  nombre: string;

  @Prop({ type: String, enum: NaturalezaCuenta, required: true })
  naturaleza: NaturalezaCuenta;

  @Prop({ default: true })
  activo: boolean;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Estudio', required: true, index: true })
  estudioId: Types.ObjectId;
}

export const CuentaContableSchema = SchemaFactory.createForClass(CuentaContable);
CuentaContableSchema.index({ estudioId: 1, codigo: 1 }, { unique: true });
