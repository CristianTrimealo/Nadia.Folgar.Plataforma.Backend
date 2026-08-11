import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CatedralSyncEstado, CatedralSyncOperacion } from '../schemas/catedral-sync-log.schema';

export class QueryCatedralSyncLogDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(CatedralSyncEstado)
  estado?: CatedralSyncEstado;

  @IsOptional()
  @IsEnum(CatedralSyncOperacion)
  operacion?: CatedralSyncOperacion;
}
