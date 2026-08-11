import { IsOptional, IsString, Matches } from 'class-validator';

/**
 * Payload opcional del disparo manual (`POST /iva-tareas/generar`). Sin
 * `periodo` genera el mes en curso (igual que el cron); se puede forzar un
 * período distinto para pruebas del ciclo mensual completo sin esperar al
 * cron (checklist FOLGAR-051: "Simular generación de un mes completo").
 */
export class GenerarTareasDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'periodo debe tener el formato YYYY-MM' })
  periodo?: string;
}
