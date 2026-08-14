import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { OperadorCondicionMonto } from '../schemas/regla-clasificacion.schema';

export class CondicionMontoDto {
  @IsEnum(OperadorCondicionMonto)
  operador: OperadorCondicionMonto;

  @IsOptional()
  @IsNumber()
  valor?: number;

  @IsOptional()
  @IsNumber()
  valorMin?: number;

  @IsOptional()
  @IsNumber()
  valorMax?: number;
}
