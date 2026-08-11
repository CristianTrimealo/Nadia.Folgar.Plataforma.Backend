import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { MovimientoDto } from './movimiento.dto';

/** Payload de edición manual de movimientos antes de confirmarlos (checklist FOLGAR-009). */
export class UpdateMovimientosDto {
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => MovimientoDto)
  movimientos: MovimientoDto[];
}
