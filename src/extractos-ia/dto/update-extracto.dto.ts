import { IsMongoId, IsOptional } from 'class-validator';

/**
 * Permite corregir el cliente y/o la cuenta bancaria de un extracto ya
 * cargado (p. ej. si se lo procesó contra el cliente o la cuenta
 * equivocada), sin reprocesar el PDF ni tocar los movimientos ya extraídos.
 */
export class UpdateExtractoDto {
  @IsOptional()
  @IsMongoId()
  clienteId?: string;

  @IsOptional()
  @IsMongoId()
  cuentaBancariaId?: string;
}
