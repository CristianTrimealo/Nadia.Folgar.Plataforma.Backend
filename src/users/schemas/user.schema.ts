import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { baseSchemaOptions } from '../../common/database/base-schema.options';

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
}

export const UserSchema = SchemaFactory.createForClass(User);
