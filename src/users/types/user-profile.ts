/** Forma de "Mi perfil" que devuelve el Backend — ver `UsersService.toProfileResponse`. */
export interface UserProfile {
  userId: string;
  email: string;
  nombre: string;
  fechaNacimiento: string | null;
  pais: string | null;
  provincia: string | null;
  ciudad: string | null;
  telefono: string | null;
  /** `data:<contentType>;base64,<...>` listo para un <img src>, o null si no cargó foto. */
  avatarDataUrl: string | null;
}
