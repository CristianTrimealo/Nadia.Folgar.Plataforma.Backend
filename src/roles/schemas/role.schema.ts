import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../common/database/base-schema.options';
import { PermissionCode } from '../../common/constants/permissions';

export type RoleDocument = HydratedDocument<Role>;

@Schema(baseSchemaOptions)
export class Role {
  @Prop({ required: true, unique: true })
  nombre: string;

  @Prop({ type: [String], default: [] })
  permisos: PermissionCode[];

  /** admin/contador/cliente son roles de sistema: no se pueden borrar. */
  @Prop({ default: false })
  esDeSistema: boolean;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
