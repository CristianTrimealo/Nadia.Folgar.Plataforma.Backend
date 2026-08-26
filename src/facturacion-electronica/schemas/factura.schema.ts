import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { baseSchemaOptions } from '../../common/database/base-schema.options';

export type FacturaDocument = HydratedDocument<Factura>;

export enum EstadoFactura {
  PREFACTURA = 'prefactura',
  APROBADA = 'aprobada',
  EMITIDA = 'emitida',
  RECHAZADA = 'rechazada',
}

@Schema(baseSchemaOptions)
export class Factura {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Cliente', required: true, index: true })
  clienteId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  concepto: string;

  @Prop({ required: true, min: 0 })
  monto: number;

  @Prop({ type: String, enum: EstadoFactura, default: EstadoFactura.PREFACTURA })
  estado: EstadoFactura;

  @Prop()
  motivoRechazo?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  aprobadoPor?: Types.ObjectId;

  /**
   * true si el cliente tenía facturas impagas al momento de aprobar y un
   * responsable decidió aprobar igual (checklist FOLGAR-054: "permitir
   * excepción manual justificada y auditable"). `justificacionExcepcion` es
   * obligatoria cuando esto es true — se valida en el service, no en el schema.
   */
  @Prop({ default: false })
  excepcionBloqueoPorImpagos: boolean;

  @Prop()
  justificacionExcepcion?: string;

  /**
   * Datos del comprobante emitido — se completan al llamar al puerto
   * `FacturacionElectronicaPort` (hoy el adapter stub, ver
   * `facturacion-electronica.module.ts`). CAE = Código de Autorización de
   * Emisión que devuelve ARCA/el webservice real cuando exista.
   */
  @Prop()
  cae?: string;

  @Prop()
  numeroComprobante?: string;

  @Prop()
  fechaEmision?: Date;

  /** Si la factura ya fue pagada por el cliente — determina si bloquea futuras emisiones. */
  @Prop({ default: false })
  pagada: boolean;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Estudio', required: true, index: true })
  estudioId: Types.ObjectId;
}

export const FacturaSchema = SchemaFactory.createForClass(Factura);
FacturaSchema.index({ estudioId: 1, clienteId: 1, estado: 1 });
