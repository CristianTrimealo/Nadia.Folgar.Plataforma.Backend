import {
  IsArray,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { RegimenFiscal } from '../../clientes/schemas/cliente.schema';

export class CreateUserDto {
  /** Opcional — ver el comentario en `user.schema.ts`: sin email no puede loguearse todavía, se completa después. */
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  nombre: string;

  @IsArray()
  @IsMongoId({ each: true })
  roleIds: string[];

  @IsOptional()
  @IsMongoId()
  clienteId?: string;

  /** "Contacto" en la pantalla Personal del Frontend — mismo campo que `telefono` de "Mi perfil". */
  @IsOptional()
  @IsString()
  telefono?: string;

  /** Solo aplica a "Personal" (equipo interno) — ver el comentario en `user.schema.ts`. */
  @IsOptional()
  @IsEnum(RegimenFiscal)
  regimenFiscal?: RegimenFiscal;
}
