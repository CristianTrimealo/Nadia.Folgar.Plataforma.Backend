import { IsDateString, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { Genero } from '../schemas/user.schema';

/** Autogestión del propio perfil (pantalla "Mi perfil" del Frontend) — sin `password` ni `roleIds`. */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string;

  @IsOptional()
  @IsString()
  pais?: string;

  @IsOptional()
  @IsString()
  provincia?: string;

  @IsOptional()
  @IsString()
  ciudad?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  /** Ver `User.genero` — determina la forma del nombre del rol en el Frontend. */
  @IsOptional()
  @IsIn(['masculino', 'femenino'])
  genero?: Genero;
}
