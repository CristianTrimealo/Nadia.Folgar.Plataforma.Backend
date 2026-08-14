import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateCuentaContableDto } from './create-cuenta-contable.dto';

export class UpdateCuentaContableDto extends PartialType(CreateCuentaContableDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
