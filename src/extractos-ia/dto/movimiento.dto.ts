import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { TipoMovimiento } from '../schemas/extracto-bancario.schema';

/** Forma de un movimiento tal como lo edita el contador (checklist FOLGAR-009). */
export class MovimientoDto {
  @IsString()
  @IsNotEmpty()
  fecha: string;

  @IsString()
  @IsNotEmpty()
  concepto: string;

  @IsNumber()
  monto: number;

  @IsOptional()
  @IsEnum(TipoMovimiento)
  tipo?: TipoMovimiento;
}
