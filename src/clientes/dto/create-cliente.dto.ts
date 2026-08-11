import { IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { RegimenFiscal } from '../schemas/cliente.schema';

export class CreateClienteDto {
  @IsString()
  @MinLength(2)
  nombre: string;

  @Matches(/^\d{2}-?\d{8}-?\d{1}$/, {
    message: 'cuit debe tener formato válido (ej. 20-12345678-9)',
  })
  cuit: string;

  @IsEnum(RegimenFiscal)
  regimenFiscal: RegimenFiscal;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;
}
