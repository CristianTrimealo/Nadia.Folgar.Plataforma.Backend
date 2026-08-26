import { IsEnum } from 'class-validator';
import { ProveedorIA } from '../../common/enums/proveedor-ia.enum';

export class SetMotorPorDefectoDto {
  @IsEnum(ProveedorIA)
  proveedor: ProveedorIA;
}
