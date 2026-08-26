import {
  IsArray,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { RegimenFiscal } from '../schemas/cliente.schema';

export class CreateClienteDto {
  @IsString()
  @MinLength(2)
  nombre: string;

  @Matches(/^\d{2}-?\d{8}-?\d{1}$/, {
    message: 'cuit debe tener formato válido (ej. 20-12345678-9)',
  })
  cuit: string;

  @IsOptional()
  @IsString()
  contacto?: string;

  @IsOptional()
  @IsEnum(RegimenFiscal)
  regimenFiscal?: RegimenFiscal;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  responsable?: string;

  /**
   * IDs de usuarios de "Personal" (`users/`) — ver `responsableIds` en
   * `cliente.schema.ts`. Puede ser más de uno; ausente/`[]` = sin nadie
   * asignado manualmente (igual puede aparecer un admin en
   * `responsablesEfectivos`, ver el service).
   */
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  responsableIds?: string[];
}
