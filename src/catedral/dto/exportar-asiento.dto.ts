import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { AsignacionManualDto } from '../../asientos-contables/dto/asignacion-manual.dto';

export class ExportarAsientoDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AsignacionManualDto)
  asignacionesManuales?: AsignacionManualDto[];
}
