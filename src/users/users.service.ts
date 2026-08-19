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
    const existing = await this.userModel.findOne({ email: dto.email.toLowerCase() }).exec();
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    const passwordHash = await argon2.hash(dto.password);

    return this.userModel.create({
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      nombre: dto.nombre,
      roleIds: dto.roleIds,
      clienteId: dto.clienteId,
      estudioId,
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDocument> {
    const user = await this.findOne(id);
    Object.assign(user, dto);
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

  toProfileResponse(user: UserDocument): UserProfile {
    return {
      userId: user._id.toString(),
      email: user.email,
      nombre: user.nombre,
      fechaNacimiento: user.fechaNacimiento ? user.fechaNacimiento.toISOString() : null,
      pais: user.pais ?? null,
      provincia: user.provincia ?? null,
      ciudad: user.ciudad ?? null,
      telefono: user.telefono ?? null,
      avatarDataUrl:
        user.avatarContentType && user.avatarBase64
          ? `data:${user.avatarContentType};base64,${user.avatarBase64}`
          : null,
    };
  }
}
