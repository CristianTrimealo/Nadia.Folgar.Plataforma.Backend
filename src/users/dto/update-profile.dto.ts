import { IsDateString, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

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
}
