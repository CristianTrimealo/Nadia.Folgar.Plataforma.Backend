import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { baseSchemaOptions } from '../../common/database/base-schema.options';

export type NovedadFiscalDocument = HydratedDocument<NovedadFiscal>;

export enum NovedadFiscalEstado {
  NUEVA = 'nueva',
  VISTA = 'vista',
  RESUELTA = 'resuelta',
}

/**
 * Una novedad detectada en el Domicilio Fiscal Electrónico de un cliente
 * (checklist FOLGAR-041: "Modelo de datos de Novedad Fiscal por cliente").
 *
 * `referenciaExterna` es la clave de deduplicación: `monitorearTodos()` en
 * `AlertaPresentacionesService` no crea un registro nuevo si ya existe uno
 * con la misma combinación estudioId+clienteId+referenciaExterna. Hoy la
 * genera el adapter stub (`ArcaMonitorStubAdapter`) como puede, porque
 * todavía no hay una fuente real de la que derivarla — cuando la vía de
 * acceso a ARCA se resuelva (FOLGAR-040), el adapter real deberá seguir
 * devolviendo un valor estable para el mismo evento de ARCA.
 */
@Schema(baseSchemaOptions)
export class NovedadFiscal {
  @Prop({ type: Types.ObjectId, ref: 'Cliente', required: true, index: true })
  clienteId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  referenciaExterna: string;

  @Prop({ required: true, trim: true })
  descripcion: string;

  @Prop({ required: true })
  fecha: Date;

  @Prop({ type: String, enum: NovedadFiscalEstado, default: NovedadFiscalEstado.NUEVA })
  estado: NovedadFiscalEstado;

  @Prop({ type: Types.ObjectId, ref: 'Estudio', required: true, index: true })
  estudioId: Types.ObjectId;
}

export const NovedadFiscalSchema = SchemaFactory.createForClass(NovedadFiscal);
NovedadFiscalSchema.index({ estudioId: 1, clienteId: 1 });
// Soporta la consulta de deduplicación de `monitorearTodos()` (búsqueda por
// estudioId+clienteId+referenciaExterna) sin escanear la colección completa.
NovedadFiscalSchema.index({ estudioId: 1, clienteId: 1, referenciaExterna: 1 });
