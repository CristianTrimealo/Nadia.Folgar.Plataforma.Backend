import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as argon2 from 'argon2';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
}
