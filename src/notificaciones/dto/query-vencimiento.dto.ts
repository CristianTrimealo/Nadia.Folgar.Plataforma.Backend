import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { VencimientoEstado } from '../schemas/vencimiento.schema';

export class QueryVencimientoDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(VencimientoEstado)
  estado?: VencimientoEstado;

  @IsOptional()
  @IsMongoId()
  clienteId?: string;
}
