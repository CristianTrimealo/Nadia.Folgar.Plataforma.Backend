import { IsNotEmpty, IsString, Matches } from 'class-validator';

/** Forma de una etiqueta tal como la edita el equipo desde el Frontend. */
export class EtiquetaDto {
  @IsString()
  @IsNotEmpty()
  texto: string;

  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'color debe ser un hex de 6 dígitos, ej. #96602f' })
  color: string;
}
