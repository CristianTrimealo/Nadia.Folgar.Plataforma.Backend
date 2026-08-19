import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO del análisis previo a la carga (`POST /extractos-ia/analizar`): a
 * diferencia de `CreateExtractoDto`, no pide `clienteId`/`cuentaBancariaId`/
 * `periodo` porque el propósito de este endpoint es justamente ayudar a
 * completarlos antes de que el contador los elija a mano.
 */
export class AnalizarExtractoDto {
  @IsString()
  @IsNotEmpty()
  nombreArchivo: string;

  @IsString()
  @IsNotEmpty()
  contenidoBase64: string;
}
