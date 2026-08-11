import { IsDateString, IsEnum, IsMongoId, IsOptional, IsString, MinLength } from 'class-validator';
import { VencimientoEstado } from '../schemas/vencimiento.schema';

export class CreateVencimientoDto {
  @IsString()
  @MinLength(2)
  tipo: string;

  @IsMongoId()
  clienteId: string;

  @IsDateString()
  fecha: string;

  @IsOptional()
  @IsEnum(VencimientoEstado)
  estado?: VencimientoEstado;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
