import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateClienteDto } from './create-cliente.dto';

/**
 * A diferencia de la versión vieja de `responsableId` (campo simple, que
 * necesitaba redeclararse acá para aceptar `null` como "desasignar"),
 * `responsableIds` ya es un array: no hace falta un caso especial para
 * "vaciarlo" porque `[]` ya es un valor normal y válido para
 * `@IsArray()`/`@IsMongoId({ each: true })` (heredados de `CreateClienteDto`
 * vía `PartialType`, ambos ya con `@IsOptional()`). `undefined` (campo
 * ausente del body) sigue significando "no tocar la asignación actual" —
 * ver `ClientesService.update()`.
 */
export class UpdateClienteDto extends PartialType(CreateClienteDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
