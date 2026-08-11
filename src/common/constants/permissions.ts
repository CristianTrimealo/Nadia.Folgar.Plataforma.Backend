export const PERMISSIONS = {
  USERS_READ: 'users.read',
  USERS_WRITE: 'users.write',
  ROLES_READ: 'roles.read',
  ROLES_WRITE: 'roles.write',
  CLIENTES_READ: 'clientes.read',
  CLIENTES_WRITE: 'clientes.write',
  EXTRACTOS_READ: 'extractos.read',
  EXTRACTOS_WRITE: 'extractos.write',
  PORTAL_DOCUMENTOS_READ: 'portal.documentos.read',
  PORTAL_DOCUMENTOS_WRITE: 'portal.documentos.write',
  NOTIFICACIONES_READ: 'notificaciones.read',
  NOTIFICACIONES_WRITE: 'notificaciones.write',
  ALERTAS_READ: 'alertas.read',
  ALERTAS_WRITE: 'alertas.write',
  IVA_TAREAS_READ: 'iva-tareas.read',
  IVA_TAREAS_WRITE: 'iva-tareas.write',
  FACTURACION_READ: 'facturacion.read',
  FACTURACION_WRITE: 'facturacion.write',
  FACTURACION_APROBAR: 'facturacion.aprobar',
  CATEDRAL_READ: 'catedral.read',
  CATEDRAL_WRITE: 'catedral.write',
  ASISTENTE_IA_USO: 'asistente-ia.uso',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Roles fijos del estudio (admin/contador/cliente) mapeados a permisos por defecto. */
export const DEFAULT_ROLE_PERMISSIONS: Record<'admin' | 'contador' | 'cliente', PermissionCode[]> =
  {
    admin: Object.values(PERMISSIONS),
    contador: [
      PERMISSIONS.CLIENTES_READ,
      PERMISSIONS.CLIENTES_WRITE,
      PERMISSIONS.EXTRACTOS_READ,
      PERMISSIONS.EXTRACTOS_WRITE,
      PERMISSIONS.PORTAL_DOCUMENTOS_READ,
      PERMISSIONS.PORTAL_DOCUMENTOS_WRITE,
      PERMISSIONS.NOTIFICACIONES_READ,
      PERMISSIONS.NOTIFICACIONES_WRITE,
      PERMISSIONS.ALERTAS_READ,
      PERMISSIONS.IVA_TAREAS_READ,
      PERMISSIONS.IVA_TAREAS_WRITE,
      PERMISSIONS.FACTURACION_READ,
      PERMISSIONS.FACTURACION_WRITE,
      PERMISSIONS.CATEDRAL_READ,
      PERMISSIONS.CATEDRAL_WRITE,
      PERMISSIONS.ASISTENTE_IA_USO,
    ],
    cliente: [PERMISSIONS.PORTAL_DOCUMENTOS_READ],
  };
