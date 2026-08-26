import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { baseSchemaOptions } from '../../common/database/base-schema.options';
import { ProveedorIA } from '../../common/enums/proveedor-ia.enum';

export type IntegracionIaDocument = HydratedDocument<IntegracionIa>;

/**
 * Credencial de un proveedor de IA que el estudio conectó en Configuración →
 * Integraciones (`IntegracionesService.conectar`). Una por `(estudioId,
 * proveedor)` — conectar de nuevo el mismo proveedor reemplaza la anterior
 * (rotar una key es "conectar de nuevo", no un flujo aparte).
 *
 * `apiKeyCifrada` nunca sale de este módulo en claro — `SecretCipherService`
 * la cifra al guardar y la descifra solo dentro de
 * `AiProviderResolverService`, justo antes de pasársela a un adapter.
 * `apiKeyPreview` (ej. "····kuY0") es lo único que se manda al Frontend.
 */
@Schema(baseSchemaOptions)
export class IntegracionIa {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Estudio', required: true, index: true })
  estudioId: Types.ObjectId;

  @Prop({ type: String, enum: ProveedorIA, required: true })
  proveedor: ProveedorIA;

  @Prop({ required: true })
  apiKeyCifrada: string;

  /** Solo para mostrar en el Frontend — nunca la key completa. */
  @Prop({ required: true })
  apiKeyPreview: string;

  /** Override del modelo por default del adapter (ej. otro modelo de OpenAI) — opcional. */
  @Prop()
  modelo?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  conectadoPor: Types.ObjectId;
}

export const IntegracionIaSchema = SchemaFactory.createForClass(IntegracionIa);
IntegracionIaSchema.index({ estudioId: 1, proveedor: 1 }, { unique: true });
