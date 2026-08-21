import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO del análisis previo a la importación (`POST
 * /iva-tareas/importar-documento/analizar`): no persiste nada, solo le pide
 * a la IA que lea el documento y proponga tareas — el contador recién elige
 * el Cliente para el lote completo al confirmar con
 * `ImportarTareasDocumentoDto`. Mismo criterio que `AnalizarExtractoDto` en
 * extractos-ia.
 */
export class AnalizarDocumentoTareasDto {
  @IsString()
  @IsNotEmpty()
  nombreArchivo: string;

  @IsString()
  @IsNotEmpty()
  contenidoBase64: string;
}
