import { IsMongoId, IsNumber, IsString, Min, MinLength } from 'class-validator';

export class CreateFacturaDto {
  @IsMongoId()
  clienteId: string;

  @IsString()
  @MinLength(2)
  concepto: string;

  @IsNumber()
  @Min(0.01)
  monto: number;
}
