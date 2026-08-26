import { IsEnum, IsMongoId } from 'class-validator';
import { LadoAsiento } from '../../reglas-clasificacion/schemas/regla-clasificacion.schema';

/**
 * Asignación manual (previsualización, no persistida como regla) de un
 * movimiento puntual del extracto a una cuenta contable + lado — mismo rol
 * que `asignacionesLocales`/`ladosLocales` en `ResumenAsientoContable.tsx`
 * del Frontend, ahora validado server-side antes de exportar. Solo resuelve
 * movimientos que ninguna `ReglaClasificacion` activa clasificó.
 */
export class AsignacionManualDto {
  @IsMongoId()
  movimientoId: string;

  @IsMongoId()
  cuentaContableId: string;

  @IsEnum(LadoAsiento)
  ladoAsiento: LadoAsiento;
}
