import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ProveedorIA } from '../../common/enums/proveedor-ia.enum';

export class ConectarIntegracionDto {
  @IsEnum(ProveedorIA)
  proveedor: ProveedorIA;

  @IsString()
  @MinLength(10, { message: 'La API key no parece completa' })
  apiKey: string;

  @IsOptional()
  @IsString()
  modelo?: string;
}
