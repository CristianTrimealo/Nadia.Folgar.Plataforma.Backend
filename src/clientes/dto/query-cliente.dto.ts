import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { RegimenFiscal } from '../schemas/cliente.schema';

export class QueryClienteDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(RegimenFiscal)
  regimenFiscal?: RegimenFiscal;
}
