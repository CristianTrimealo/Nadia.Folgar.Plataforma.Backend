import { PermissionCode } from '../constants/permissions';

export type UserRole = 'admin' | 'contador' | 'cliente';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  roles: UserRole[];
  permissions: PermissionCode[];
  estudioId: string;
  clienteId?: string;
}
