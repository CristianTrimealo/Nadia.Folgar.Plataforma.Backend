import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { baseSchemaOptions } from '../../common/database/base-schema.options';
import { RegimenFiscal } from '../../clientes/schemas/cliente.schema';

export type UserDocument = HydratedDocument<User>;

@Schema(baseSchemaOptions)
export class User {
  /**
   * Opcional a propósito (pedido explícito del usuario, ver `features/personal`
   * del Frontend): un integrante de "Personal" se puede dar de alta sin saber
   * todavía su email real — nunca se inventa uno — y completarlo después vía
   * `PATCH /users/:id`. Mientras no tenga email no puede loguearse por ningún
   * medio (ni password, que ya no se autogestiona por acá, ni login social,
   * que matchea por email en `AuthService.loginWithSocialCode`) — es
   * exactamente lo esperado, no un caso a resolver. `sparse: true` en el
   * índice único es necesario: sin eso, Mongo trata "sin email" como el mismo
   * valor `null` para el índice y el segundo usuario sin email chocaría con
   * el primero.
   */
  @Prop({ unique: true, sparse: true, lowercase: true, trim: true, required: false })
  email?: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true })
  nombre: string;

  @Prop({ type: [Types.ObjectId], ref: 'Role', default: [] })
  roleIds: Types.ObjectId[];

  @Prop({ default: true })
  activo: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Estudio', required: true })
  estudioId: Types.ObjectId;

  /** Solo se completa para usuarios con rol "cliente": a qué Cliente del Estudio representan. */
  @Prop({ type: Types.ObjectId, ref: 'Cliente', required: false })
  clienteId?: Types.ObjectId;

  // ── Datos de "Mi perfil" (autogestión, sin backlog FOLGAR asociado — pedido
  // directo del Frontend para la pantalla de perfil de usuario) ─────────────

  @Prop({ required: false })
  fechaNacimiento?: Date;

  @Prop({ trim: true, required: false })
  pais?: string;

  @Prop({ trim: true, required: false })
  provincia?: string;

  @Prop({ trim: true, required: false })
  ciudad?: string;

  @Prop({ trim: true, required: false })
  telefono?: string;

  /**
   * Solo tiene sentido para "Personal" (equipo interno, ver `features/personal`
   * del Frontend): buena parte del equipo del Estudio son monotributistas o
   * responsables inscriptos que facturan como independientes, no empleados en
   * relación de dependencia — mismo enum que `Cliente.regimenFiscal`, gestionado
   * por el administrador vía `PATCH /users/:id`, no autogestionable desde
   * "Mi perfil".
   */
  @Prop({ type: String, enum: RegimenFiscal, required: false })
  regimenFiscal?: RegimenFiscal;

  /**
   * Marca al dueño real del estudio (hoy Nadia Folgar) para la columna
   * "Responsable" de `ClientesPage` (ver `ClientesService.findResponsablesAutomaticos`)
   * — pedido explícito del usuario: quien tenga esto en `true` se suma como
   * responsable de TODOS los clientes, sin asignación manual. A propósito
   * NO se deriva del rol "admin": el estudio tiene una cuenta de admin de
   * desarrollo/pruebas ("Yami", `admin@folgar.com.ar`) con permisos de
   * administrador pero que el usuario pidió explícitamente que NO aparezca
   * en esa columna — de ahí que sea un campo aparte, no "cualquier admin".
   * Sin selector en el Frontend por ahora: se marca a mano contra la base
   * real (mismo criterio que otras migraciones puntuales de este módulo,
   * ver CLAUDE.md), no hay UI para tildarlo/destildarlo todavía.
   */
  @Prop({ default: false })
  esTitular: boolean;

  /**
   * Foto de perfil como base64 directo en Mongo — misma decisión temporal de
   * alcance que `Documento` en portal-clientes (ver la nota ahí): no hay
   * storage de objetos confirmado todavía. `UpdateAvatarDto` le pone un tope
   * de tamaño (`MAX_AVATAR_BYTES`). Reemplazar por una key/URL de storage
   * real junto con `Documento` cuando se defina el proveedor.
   */
  @Prop({ required: false })
  avatarContentType?: string;

  @Prop({ required: false })
  avatarBase64?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
