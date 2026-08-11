import { IsEnum, IsMongoId, IsOptional, IsString, Matches } from 'class-validator';
import { Jurisdiccion } from '../schemas/tarea-presentacion.schema';

/** Filtros del tablero Kanban — sin paginación: siempre trae la lista completa del período. */
export class QueryKanbanDto {
  @IsOptional()
  @IsEnum(Jurisdiccion)
  jurisdiccion?: Jurisdiccion;

  @IsOptional()
  @IsMongoId()
  asignadoA?: string;

  /** Formato "YYYY-MM". Si no se pasa, se usa el período actual. */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'periodo debe tener el formato YYYY-MM' })
  periodo?: string;
}
