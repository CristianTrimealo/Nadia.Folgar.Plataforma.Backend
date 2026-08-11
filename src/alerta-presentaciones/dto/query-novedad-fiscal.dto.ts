import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { NovedadFiscalEstado } from '../schemas/novedad-fiscal.schema';

export class QueryNovedadFiscalDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(NovedadFiscalEstado)
  estado?: NovedadFiscalEstado;

  @IsOptional()
  @IsMongoId()
  clienteId?: string;
}
