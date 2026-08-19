import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { baseSchemaOptions } from '../../common/database/base-schema.options';

export type ReglaClasificacionDocument = HydratedDocument<ReglaClasificacion>;

export enum LadoAsiento {
  DEBE = 'debe',
  HABER = 'haber',
}

export enum ProcedenciaRegla {
  MANUAL = 'manual',
  APRENDIDA = 'aprendida',
  /** Inferida por la IA al procesar un extracto (`ExtractosIaProcessor`), sin intervención humana. */
  IA = 'ia',
}

/**
 * Prioridad con la que se crean las reglas de procedencia `IA` — bien por
 * encima del default (100) para que una regla manual o aprendida (revisada
 * por un humano) siempre le gane si compiten por el mismo movimiento; "menor
 * número se evalúa primero" (ver `ReglaFormDialog` en el Frontend).
 */
export const PRIORIDAD_SUGERIDA_IA = 500;

export enum OperadorCondicionMonto {
  IGUAL = 'igual',
  ENTRE = 'entre',
}

/**
 * Filtro opcional por monto exacto o rango — resuelve casos como el de los
 * pagos "Imp.afp" del extracto de Santander: mismo texto de descripción,
 * pero tres montos distintos que corresponden a tres cuentas contables
 * distintas (SUSS, IVA, IIBB a pagar). Sin esta condición, esas reglas
 * quedarían todas empatadas por texto y el motor de clasificación (Fase C)
 * las dejaría "sin_clasificar" en vez de elegir una al azar.
 */
@Schema({ _id: false })
export class CondicionMonto {
  @Prop({ type: String, enum: OperadorCondicionMonto, required: true })
  operador: OperadorCondicionMonto;

  @Prop()
  valor?: number;

  @Prop()
  valorMin?: number;

  @Prop()
  valorMax?: number;
}

export const CondicionMontoSchema = SchemaFactory.createForClass(CondicionMonto);

/**
 * Regla de clasificación: mapea movimientos de un extracto (por texto y/o
 * monto) a una cuenta contable del plan de cuentas del cliente. Es el motor
 * de "aprendizaje" pedido — determinístico y auditable (quién la creó, de
 * qué corrección se originó si es 'aprendida'), no un modelo de caja negra.
 * En esta fase el CRUD es manual; el motor que las aplica automáticamente a
 * los movimientos de un extracto se construye en una fase posterior.
 */
@Schema(baseSchemaOptions)
export class ReglaClasificacion {
  @Prop({ type: Types.ObjectId, ref: 'Cliente', required: true, index: true })
  clienteId: Types.ObjectId;

  /** Null = aplica a todas las cuentas bancarias del cliente. */
  @Prop({ type: Types.ObjectId, ref: 'CuentaBancaria' })
  cuentaBancariaId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  conceptoContable: string;

  @Prop({ type: Types.ObjectId, ref: 'CuentaContable', required: true })
  cuentaContableId: Types.ObjectId;

  @Prop({ type: String, enum: LadoAsiento, required: true })
  ladoAsiento: LadoAsiento;

  @Prop({ trim: true })
  patronTexto?: string;

  @Prop({ type: CondicionMontoSchema })
  condicionMonto?: CondicionMonto;

  @Prop({ type: String, enum: ['debito', 'credito'] })
  tipoMovimiento?: 'debito' | 'credito';

  @Prop({ default: 100 })
  prioridad: number;

  @Prop({ type: String, enum: ProcedenciaRegla, required: true, default: ProcedenciaRegla.MANUAL })
  procedencia: ProcedenciaRegla;

  /** Si `procedencia` es 'aprendida', qué movimiento originó esta regla (auditoría). */
  @Prop({ type: Types.ObjectId })
  origenMovimientoId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  creadoPor: Types.ObjectId;

  @Prop({ default: true })
  activa: boolean;

  /** Incrementa solo cuando un humano confirma una clasificación que usó esta regla (Fase C). */
  @Prop({ default: 0 })
  vecesAplicada: number;

  @Prop({ type: Types.ObjectId, ref: 'Estudio', required: true, index: true })
  estudioId: Types.ObjectId;
}

export const ReglaClasificacionSchema = SchemaFactory.createForClass(ReglaClasificacion);
ReglaClasificacionSchema.index({ estudioId: 1, clienteId: 1, activa: 1 });
