import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { baseSchemaOptions } from '../../common/database/base-schema.options';

export type ComunicadoDocument = HydratedDocument<Comunicado>;

/**
 * Un aviso redactado por el equipo del estudio para uno o más clientes.
 * `clienteId` es OPCIONAL: si viene indefinido (no se manda), el comunicado
 * es "para todos los clientes del estudio" — no se duplica un registro por
 * cliente, se resuelve en tiempo de lectura (ver
 * `PortalClientesService.findComunicadosParaUsuario`).
 */
@Schema(baseSchemaOptions)
export class Comunicado {
  @Prop({ required: true, trim: true })
  titulo: string;

  @Prop({ required: true })
  cuerpo: string;

  /** Sin valor => comunicado general, visible para todos los clientes del estudio. */
  @Prop({ type: Types.ObjectId, ref: 'Cliente', required: false, index: true })
  clienteId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Estudio', required: true, index: true })
  estudioId: Types.ObjectId;
}

export const ComunicadoSchema = SchemaFactory.createForClass(Comunicado);
ComunicadoSchema.index({ estudioId: 1, clienteId: 1 });
