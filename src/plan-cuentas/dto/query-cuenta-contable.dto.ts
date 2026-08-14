import { IsMongoId, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryCuentaContableDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  clienteId?: string;
}
