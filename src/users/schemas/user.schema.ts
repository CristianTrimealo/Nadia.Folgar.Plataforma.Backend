import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { baseSchemaOptions } from '../../common/database/base-schema.options';
import { RegimenFiscal } from '../../clientes/schemas/cliente.schema';

export type UserDocument = HydratedDocument<User>;

@Schema(baseSchemaOptions)
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true })
  nombre: string;

  @Prop({ type: [Types.ObjectId], ref: 'Role', default: [] })
  roleIds: Types.ObjectId[];

  @Prop({ default: true })
  activo: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Estudio', required: true })
  estudioId: Types.ObjectId;

  /** Solo se completa para usuarios con rol "cliente": a qué Cliente del Estudio representan. */
  @Prop({ type: Types.ObjectId, ref: 'Cliente', required: false })
  clienteId?: Types.ObjectId;

  // ── Datos de "Mi perfil" (autogestión, sin backlog FOLGAR asociado — pedido
  // directo del Frontend para la pantalla de perfil de usuario) ─────────────

  @Prop({ required: false })
  fechaNacimiento?: Date;

  @Prop({ trim: true, required: false })
  pais?: string;

  @Prop({ trim: true, required: false })
  provincia?: string;

  @Prop({ trim: true, required: false })
  ciudad?: string;

  @Prop({ trim: true, required: false })
  telefono?: string;

  /**
   * Solo tiene sentido para "Personal" (equipo interno, ver `features/personal`
   * del Frontend): buena parte del equipo del Estudio son monotributistas o
   * responsables inscriptos que facturan como independientes, no empleados en
   * relación de dependencia — mismo enum que `Cliente.regimenFiscal`, gestionado
   * por el administrador vía `PATCH /users/:id`, no autogestionable desde
   * "Mi perfil".
   */
  @Prop({ type: String, enum: RegimenFiscal, required: false })
  regimenFiscal?: RegimenFiscal;

  /**
   * Foto de perfil como base64 directo en Mongo — misma decisión temporal de
   * alcance que `Documento` en portal-clientes (ver la nota ahí): no hay
   * storage de objetos confirmado todavía. `UpdateAvatarDto` le pone un tope
   * de tamaño (`MAX_AVATAR_BYTES`). Reemplazar por una key/URL de storage
   * real junto con `Documento` cuando se defina el proveedor.
   */
  @Prop({ required: false })
  avatarContentType?: string;

  @Prop({ required: false })
  avatarBase64?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
