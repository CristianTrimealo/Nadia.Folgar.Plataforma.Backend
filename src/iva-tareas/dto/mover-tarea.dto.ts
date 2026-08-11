import { IsEnum, IsInt, Min } from 'class-validator';
import { EstadoTarea } from '../schemas/tarea-presentacion.schema';

/** Payload que dispara el drag & drop del tablero Kanban en el Frontend. */
export class MoverTareaDto {
  @IsEnum(EstadoTarea)
  estado: EstadoTarea;

  /** Posición destino dentro de la columna (0-based), tal como quedó tras soltar la tarjeta. */
  @IsInt()
  @Min(0)
  posicion: number;
}
