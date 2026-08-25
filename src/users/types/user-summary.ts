/**
 * Forma pública de un usuario para pantallas de administración (hoy: Personal
 * del Frontend, `GET/POST/PATCH /users`) — ver `UsersService.toSummary`.
 * A propósito NO expone `passwordHash`: antes de esto `UsersController`
 * devolvía el `UserDocument` de Mongoose tal cual, que sí lo incluye (nadie
 * había conectado el Frontend a `/users` todavía, así que no se había notado).
 */
export interface UserSummary {
  _id: string;
  email: string;
  nombre: string;
  telefono: string | null;
  regimenFiscal: string | null;
  roles: { _id: string; nombre: string }[];
  activo: boolean;
  /** `data:<contentType>;base64,<...>` listo para un <img src>, o null si no cargó foto. */
  avatarDataUrl: string | null;
}
