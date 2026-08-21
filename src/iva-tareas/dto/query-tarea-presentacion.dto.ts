import { IsEnum, IsMongoId, IsOptional, IsString, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { EstadoTarea, Jurisdiccion } from '../schemas/tarea-presentacion.schema';

export class QueryTareaPresentacionDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(Jurisdiccion)
  jurisdiccion?: Jurisdiccion;

  @IsOptional()
  @IsEnum(EstadoTarea)
  estado?: EstadoTarea;

  /** Filtra tareas donde este usuario está entre los asignados. */
  @IsOptional()
  @IsMongoId()
  miembro?: string;

  @IsOptional()
  @IsMongoId()
  clienteId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'periodo debe tener el formato YYYY-MM' })
  periodo?: string;
}
