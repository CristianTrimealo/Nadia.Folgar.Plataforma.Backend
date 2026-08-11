import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { baseSchemaOptions } from '../../common/database/base-schema.options';

export type CatedralSyncLogDocument = HydratedDocument<CatedralSyncLog>;

export enum CatedralSyncOperacion {
  EXPORTAR_CLIENTES = 'exportar_clientes',
  IMPORTAR_MOVIMIENTOS = 'importar_movimientos',
}

export enum CatedralSyncEstado {
  EXITO = 'exito',
  ERROR = 'error',
  PENDIENTE = 'pendiente',
}

/** Auditoría de operaciones de sincronización con Catedral (checklist FOLGAR-030: "Log de operaciones de integración"). */
@Schema(baseSchemaOptions)
export class CatedralSyncLog {
  @Prop({ type: String, enum: CatedralSyncOperacion, required: true })
  operacion: CatedralSyncOperacion;

  @Prop({
    type: String,
    enum: CatedralSyncEstado,
    required: true,
    default: CatedralSyncEstado.PENDIENTE,
  })
  estado: CatedralSyncEstado;

  /** Detalle libre: mensaje del adapter, error, o cualquier información de diagnóstico. */
  @Prop({ trim: true })
  detalle?: string;

  @Prop({ required: true, default: Date.now })
  fecha: Date;

  @Prop({ type: Types.ObjectId, ref: 'Estudio', required: true, index: true })
  estudioId: Types.ObjectId;
}

export const CatedralSyncLogSchema = SchemaFactory.createForClass(CatedralSyncLog);
CatedralSyncLogSchema.index({ estudioId: 1, fecha: -1 });
