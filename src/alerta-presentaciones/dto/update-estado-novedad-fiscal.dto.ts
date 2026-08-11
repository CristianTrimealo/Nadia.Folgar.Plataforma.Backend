import { IsIn } from 'class-validator';
import { NovedadFiscalEstado } from '../schemas/novedad-fiscal.schema';

/**
 * El estado `nueva` no es asignable manualmente vía este DTO: lo asigna
 * `monitorearTodos()` al crear el registro. Desde la bandeja de alertas el
 * equipo solo puede avanzar el estado hacia `vista` o `resuelta`.
 */
export class UpdateEstadoNovedadFiscalDto {
  @IsIn([NovedadFiscalEstado.VISTA, NovedadFiscalEstado.RESUELTA])
  estado: NovedadFiscalEstado.VISTA | NovedadFiscalEstado.RESUELTA;
}
