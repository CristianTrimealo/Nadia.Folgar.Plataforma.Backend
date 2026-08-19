import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { EstadoExtracto } from '../schemas/extracto-bancario.schema';

export class QueryExtractoDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  clienteId?: string;

  @IsOptional()
  @IsMongoId()
  cuentaBancariaId?: string;

  @IsOptional()
  @IsEnum(EstadoExtracto)
  estado?: EstadoExtracto;
}
