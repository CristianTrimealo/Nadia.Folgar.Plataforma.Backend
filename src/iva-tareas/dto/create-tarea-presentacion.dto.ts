import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { EstadoTarea, Jurisdiccion } from '../schemas/tarea-presentacion.schema';
import { ChecklistItemDto } from './checklist-item.dto';

/**
 * Alta manual de una tarea (fuera del ciclo automático de
 * `generarTareasDelMes`) — pensada para casos excepcionales, ej. un cliente
 * que se suma a mitad de mes. El flujo normal es el cron mensual.
 */
export class CreateTareaPresentacionDto {
  @IsMongoId()
  clienteId: string;

  @IsEnum(Jurisdiccion)
  jurisdiccion: Jurisdiccion;

  /** Formato "YYYY-MM". */
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'periodo debe tener el formato YYYY-MM' })
  periodo: string;

  @IsOptional()
  @IsEnum(EstadoTarea)
  estado?: EstadoTarea;

  @IsOptional()
  @IsMongoId()
  asignadoA?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklist?: ChecklistItemDto[];
}
