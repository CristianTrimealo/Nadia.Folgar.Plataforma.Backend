import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryReglaNotificacionDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  tipoVencimiento?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  activa?: boolean;
}
