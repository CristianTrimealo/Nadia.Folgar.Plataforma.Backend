import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/** Una tarea ya revisada/ajustada por el contador en el paso de revisión del Frontend. */
export class TareaImportadaDto {
  @IsString()
  @MaxLength(300)
  titulo: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'descripcion no puede superar los 5000 caracteres' })
  descripcion?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  checklist?: string[];
}

/**
 * Confirma la importación (`POST /iva-tareas/importar-documento/confirmar`):
 * crea una `TareaPresentacion` por cada tarea del lote, todas en
 * `estado: 'pendiente'` para el mismo `clienteId` — sin jurisdicción, porque
 * no son una presentación puntual de ARCA/ARBA/AGIP.
 */
export class ImportarTareasDocumentoDto {
  @IsMongoId()
  clienteId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TareaImportadaDto)
  tareas: TareaImportadaDto[];
}
