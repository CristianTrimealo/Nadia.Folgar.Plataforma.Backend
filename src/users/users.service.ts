import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as argon2 from 'argon2';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { UserProfile } from './types/user-profile';
import { UserSummary } from './types/user-summary';
import { RoleDocument } from '../roles/schemas/role.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  findAll(): Promise<UserDocument[]> {
    return this.userModel.find().populate('roleIds').exec();
  }

  async findOne(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).populate('roleIds').exec();
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).populate('roleIds').exec();
  }

  async create(dto: CreateUserDto, estudioId: Types.ObjectId): Promise<UserDocument> {
    const email = dto.email?.toLowerCase().trim();
    if (email) {
      const existing = await this.userModel.findOne({ email }).exec();
      if (existing) {
        throw new ConflictException('Ya existe un usuario con ese email');
      }
    }

    const passwordHash = await argon2.hash(dto.password);

    const created = await this.userModel.create({
      email,
      passwordHash,
      nombre: dto.nombre,
      roleIds: dto.roleIds,
      clienteId: dto.clienteId,
      telefono: dto.telefono,
      regimenFiscal: dto.regimenFiscal,
      estudioId,
    });
    // Para que `toSummary` pueda leer los nombres de rol del usuario recién
    // creado sin un segundo viaje a la base — mismo criterio que `findAll`/
    // `findOne`, que ya populan `roleIds`.
    await created.populate('roleIds');
    return created;
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDocument> {
    const user = await this.findOne(id);

    // Mismo chequeo de duplicado que ya tenía `updateOwnProfile` — acá no
    // existía (el `Object.assign` de abajo se lo hubiera dejado directo a
    // Mongo, que sí lo iba a rechazar por el índice único, pero con un
    // `MongoServerError` crudo en vez de un `ConflictException` claro).
    // Necesario desde que "Personal" permite completar el email más tarde
    // vía `PATCH /users/:id` (antes ese campo no se tocaba nunca desde acá).
    const { email: emailDto, ...resto } = dto;
    if (emailDto !== undefined) {
      const email = emailDto?.toLowerCase().trim() || undefined;
      if (email && email !== user.email) {
        const existing = await this.userModel.findOne({ email, _id: { $ne: user._id } }).exec();
        if (existing) {
          throw new ConflictException('Ya existe un usuario con ese email');
        }
      }
      user.email = email;
    }

    Object.assign(user, resto);
    await user.save();
    return user;
  }

  async deactivate(id: string): Promise<void> {
    const user = await this.findOne(id);
    user.activo = false;
    await user.save();
  }

  // ── Autogestión de "Mi perfil" ──────────────────────────────────────────

  async updateOwnProfile(id: string, dto: UpdateProfileDto): Promise<UserDocument> {
    const user = await this.findOne(id);

    if (dto.email && dto.email.toLowerCase().trim() !== user.email) {
      const email = dto.email.toLowerCase().trim();
      const existing = await this.userModel.findOne({ email, _id: { $ne: user._id } }).exec();
      if (existing) {
        throw new ConflictException('Ya existe un usuario con ese email');
      }
      user.email = email;
    }

    if (dto.nombre !== undefined) user.nombre = dto.nombre;
    if (dto.fechaNacimiento !== undefined) user.fechaNacimiento = new Date(dto.fechaNacimiento);
    if (dto.pais !== undefined) user.pais = dto.pais;
    if (dto.provincia !== undefined) user.provincia = dto.provincia;
    if (dto.ciudad !== undefined) user.ciudad = dto.ciudad;
    if (dto.telefono !== undefined) user.telefono = dto.telefono;
    if (dto.genero !== undefined) user.genero = dto.genero;

    await user.save();
    return user;
  }

  async changeOwnPassword(id: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.findOne(id);

    const valid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!valid) {
      throw new UnauthorizedException('La contraseña actual no es correcta');
    }

    user.passwordHash = await argon2.hash(dto.newPassword);
    await user.save();
  }

  async updateAvatar(id: string, dto: UpdateAvatarDto): Promise<UserDocument> {
    const user = await this.findOne(id);
    user.avatarContentType = dto.contentType;
    user.avatarBase64 = dto.contenidoBase64;
    await user.save();
    return user;
  }

  /**
   * Forma pública de un usuario para `UsersController` (hoy: pantalla
   * Personal del Frontend) — a propósito nunca devuelve `passwordHash`.
   * Requiere que `roleIds` venga poblado (`findAll`/`findOne`/`create` ya lo
   * hacen); si no, cada rol queda con `nombre: ''` en vez de romper.
   */
  toSummary(user: UserDocument): UserSummary {
    const roles = (user.roleIds as unknown as RoleDocument[]).map((role) =>
      role && typeof role === 'object' && 'nombre' in role
        ? { _id: role._id.toString(), nombre: role.nombre }
        : { _id: (role as unknown as Types.ObjectId).toString(), nombre: '' },
    );

    return {
      _id: user._id.toString(),
      email: user.email ?? null,
      nombre: user.nombre,
      telefono: user.telefono ?? null,
      regimenFiscal: user.regimenFiscal ?? null,
      roles,
      activo: user.activo,
      avatarDataUrl:
        user.avatarContentType && user.avatarBase64
          ? `data:${user.avatarContentType};base64,${user.avatarBase64}`
          : null,
      genero: user.genero ?? null,
    };
  }

  toProfileResponse(user: UserDocument): UserProfile {
    // Mismo motivo que en `AuthService.buildUserContext`: `email` es opcional
    // en el schema, pero acá siempre debería estar — "Mi perfil" es del
    // propio usuario ya autenticado, y solo se autentica quien tiene email.
    if (!user.email) {
      throw new UnauthorizedException('El usuario no tiene un email asociado');
    }

    return {
      userId: user._id.toString(),
      email: user.email,
      nombre: user.nombre,
      fechaNacimiento: user.fechaNacimiento ? user.fechaNacimiento.toISOString() : null,
      pais: user.pais ?? null,
      provincia: user.provincia ?? null,
      ciudad: user.ciudad ?? null,
      telefono: user.telefono ?? null,
      genero: user.genero ?? null,
      avatarDataUrl:
        user.avatarContentType && user.avatarBase64
          ? `data:${user.avatarContentType};base64,${user.avatarBase64}`
          : null,
    };
  }
}
