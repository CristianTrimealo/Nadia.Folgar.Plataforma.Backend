import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateReglaClasificacionDto } from './create-regla-clasificacion.dto';

export class UpdateReglaClasificacionDto extends PartialType(CreateReglaClasificacionDto) {
  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}
