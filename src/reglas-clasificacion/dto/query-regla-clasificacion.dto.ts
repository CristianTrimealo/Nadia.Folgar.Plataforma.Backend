import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ProcedenciaRegla } from '../schemas/regla-clasificacion.schema';

export class QueryReglaClasificacionDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  clienteId?: string;

  @IsOptional()
  @IsMongoId()
  cuentaBancariaId?: string;

  @IsOptional()
  @IsEnum(ProcedenciaRegla)
  procedencia?: ProcedenciaRegla;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  activa?: boolean;
}
