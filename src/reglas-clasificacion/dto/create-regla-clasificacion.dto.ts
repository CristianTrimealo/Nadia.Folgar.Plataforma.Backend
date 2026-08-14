import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LadoAsiento } from '../schemas/regla-clasificacion.schema';
import { CondicionMontoDto } from './condicion-monto.dto';

/**
 * `procedencia` NO se acepta del cliente: la deriva el servicio a partir de
 * si viene `origenMovimientoId` (regla 'aprendida' desde una corrección) o
 * no (regla 'manual' desde cero) — evita que el llamador pueda mentir sobre
 * el origen auditado de la regla.
 */
export class CreateReglaClasificacionDto {
  @IsMongoId()
  clienteId: string;

  @IsOptional()
  @IsMongoId()
  cuentaBancariaId?: string;

  @IsString()
  @MinLength(2)
  conceptoContable: string;

  @IsMongoId()
  cuentaContableId: string;

  @IsEnum(LadoAsiento)
  ladoAsiento: LadoAsiento;

  @IsOptional()
  @IsString()
  patronTexto?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CondicionMontoDto)
  condicionMonto?: CondicionMontoDto;

  @IsOptional()
  @IsIn(['debito', 'credito'])
  tipoMovimiento?: 'debito' | 'credito';

  @IsOptional()
  @IsInt()
  prioridad?: number;

  @IsOptional()
  @IsMongoId()
  origenMovimientoId?: string;
}
