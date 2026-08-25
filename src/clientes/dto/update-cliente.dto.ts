import { OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsMongoId, IsOptional } from 'class-validator';
import { CreateClienteDto } from './create-cliente.dto';

export class UpdateClienteDto extends PartialType(
  OmitType(CreateClienteDto, ['responsableId'] as const),
) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  /**
   * `responsableId` se redeclara acá (en vez de heredarlo de `CreateClienteDto`
   * vía `PartialType`) para poder aceptar `null` explícito como "desasignar el
   * responsable" — `@IsOptional()` de class-validator no valida `null` ni
   * `undefined`, así que la validación de `@IsMongoId()` no lo rechaza.
   * `undefined` (el campo directamente ausente del body) sigue significando
   * "no tocar el responsable actual".
   */
  @IsOptional()
  @IsMongoId()
  responsableId?: string | null;
}
