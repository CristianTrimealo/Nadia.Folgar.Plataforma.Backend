import { ArrayUnique, IsArray, IsIn, IsString, MinLength } from 'class-validator';
import { PERMISSIONS, PermissionCode } from '../../common/constants/permissions';

const ALL_PERMISSIONS = Object.values(PERMISSIONS) as PermissionCode[];

export class CreateRoleDto {
  @IsString()
  @MinLength(2)
  nombre: string;

  @IsArray()
  @ArrayUnique()
  @IsIn(ALL_PERMISSIONS, { each: true })
  permisos: PermissionCode[];
}
