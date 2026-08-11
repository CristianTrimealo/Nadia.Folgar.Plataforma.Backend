import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { EstadoFactura } from '../schemas/factura.schema';

export class QueryFacturaDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(EstadoFactura)
  estado?: EstadoFactura;

  @IsOptional()
  @IsMongoId()
  clienteId?: string;
}
