import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { CanalNotificacion } from '../schemas/regla-notificacion.schema';
import { PlantillaNotificacion } from '../templates/notificacion.templates';

export class CreateReglaNotificacionDto {
  @IsString()
  @MinLength(2)
  tipoVencimiento: string;

  /**
   * Positivo = días de anticipación (antes del vencimiento).
   * Negativo = días de recordatorio (después del vencimiento, ej. día 3 / día 10 de honorarios).
   */
  @IsInt()
  offsetDias: number;

  @IsEnum(CanalNotificacion)
  canal: CanalNotificacion;

  @IsEnum(PlantillaNotificacion)
  plantilla: PlantillaNotificacion;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}
