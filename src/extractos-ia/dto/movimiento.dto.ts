import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { TipoMovimiento } from '../schemas/extracto-bancario.schema';

/**
 * Forma de un movimiento tal como lo edita el contador (checklist FOLGAR-009).
 * `saldoDeclarado` es editable a propósito: si la IA transcribió mal un saldo
 * impreso, corregirlo acá dispara una re-validación de saldo completa contra
 * `saldoInicialDeclarado` del extracto (ver `ExtractosIaService.actualizarMovimientos`).
 */
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

  @IsOptional()
  @IsString()
  numeroComprobante?: string;

  @IsOptional()
  @IsNumber()
  saldoDeclarado?: number;
}
