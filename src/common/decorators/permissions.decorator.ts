import { SetMetadata } from '@nestjs/common';
import { PermissionCode } from '../constants/permissions';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
