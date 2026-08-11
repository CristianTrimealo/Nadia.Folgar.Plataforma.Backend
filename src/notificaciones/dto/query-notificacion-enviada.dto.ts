import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CanalEnvio, EstadoEnvio } from '../schemas/notificacion-enviada.schema';

export class QueryNotificacionEnviadaDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  clienteId?: string;

  @IsOptional()
  @IsMongoId()
  vencimientoId?: string;

  @IsOptional()
  @IsEnum(EstadoEnvio)
  estado?: EstadoEnvio;

  @IsOptional()
  @IsEnum(CanalEnvio)
  canal?: CanalEnvio;
}
