import {
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

  /** ID de un usuario de "Personal" (`users/`) — ver `responsableId` en `cliente.schema.ts`. */
  @IsOptional()
  @IsMongoId()
  responsableId?: string;
}
