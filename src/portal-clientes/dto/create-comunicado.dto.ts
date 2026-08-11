import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateComunicadoDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsString()
  @IsNotEmpty()
  cuerpo: string;

  /** Si no se manda, el comunicado queda dirigido a TODOS los clientes del estudio. */
  @IsOptional()
  @IsMongoId()
  clienteId?: string;
}
