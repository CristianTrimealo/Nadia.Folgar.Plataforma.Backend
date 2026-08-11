import { SchemaOptions } from 'mongoose';

/** Opciones estándar para todo schema de dominio: timestamps + sin __v. */
export const baseSchemaOptions: SchemaOptions = {
  timestamps: true,
  versionKey: false,
};
