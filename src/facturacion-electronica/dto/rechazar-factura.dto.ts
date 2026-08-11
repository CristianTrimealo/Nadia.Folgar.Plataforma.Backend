import { IsString, MinLength } from 'class-validator';

export class RechazarFacturaDto {
  @IsString()
  @MinLength(5, { message: 'El motivo de rechazo es obligatorio' })
  motivoRechazo: string;
}
