import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Forma de un ítem de checklist tal como lo edita el equipo desde el Frontend. */
export class ChecklistItemDto {
  @IsString()
  @IsNotEmpty()
  texto: string;

  @IsOptional()
  @IsBoolean()
  completado?: boolean;
}
