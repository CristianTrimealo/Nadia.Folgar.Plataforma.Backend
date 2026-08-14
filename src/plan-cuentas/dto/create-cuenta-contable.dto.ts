import { IsEnum, IsMongoId, IsString, MinLength } from 'class-validator';
import { NaturalezaCuenta } from '../schemas/cuenta-contable.schema';

export class CreateCuentaContableDto {
  @IsMongoId()
  clienteId: string;

  @IsString()
  @MinLength(1)
  codigo: string;

  @IsString()
  @MinLength(2)
  nombre: string;

  @IsEnum(NaturalezaCuenta)
  naturaleza: NaturalezaCuenta;
}
