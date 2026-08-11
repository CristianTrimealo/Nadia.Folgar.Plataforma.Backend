import { IsBoolean, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class AprobarFacturaDto {
  @IsOptional()
  @IsBoolean()
  forzarPeseADeuda?: boolean;

  /** Obligatoria si forzarPeseADeuda es true — auditoría de la excepción (FOLGAR-054). */
  @ValidateIf((dto: AprobarFacturaDto) => dto.forzarPeseADeuda === true)
  @IsString()
  @MinLength(10, { message: 'La justificación debe tener al menos 10 caracteres' })
  justificacionExcepcion?: string;
}
