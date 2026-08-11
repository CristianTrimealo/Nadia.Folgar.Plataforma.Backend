import { IsMongoId, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryComunicadoDto extends PaginationQueryDto {
  /**
   * Solo tiene efecto para usuarios admin/contador. Para un usuario rol
   * 'cliente' el service ignora este campo: siempre ve sus propios
   * comunicados + los generales (`clienteId` null), nunca los de otro
   * cliente (ver `PortalClientesService.findComunicadosParaUsuario`).
   */
  @IsOptional()
  @IsMongoId()
  clienteId?: string;
}
