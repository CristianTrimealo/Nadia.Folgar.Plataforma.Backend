import { IsEnum, IsMongoId, IsOptional, IsString, MinLength } from 'class-validator';
import { MonedaCuentaBancaria } from '../schemas/cuenta-bancaria.schema';

export class CreateCuentaBancariaDto {
  @IsMongoId()
  clienteId: string;

  @IsString()
  @MinLength(2)
  banco: string;

  @IsString()
  @MinLength(2)
  alias: string;

  @IsOptional()
  @IsString()
  numeroCuenta?: string;

  @IsOptional()
  @IsEnum(MonedaCuentaBancaria)
  moneda?: MonedaCuentaBancaria;

  @IsMongoId()
  cuentaContableId: string;
}
