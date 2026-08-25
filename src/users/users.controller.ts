import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Types } from 'mongoose';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions(PERMISSIONS.USERS_READ)
  async findAll() {
    const users = await this.usersService.findAll();
    return users.map((user) => this.usersService.toSummary(user));
  }

  @Get(':id')
  @Permissions(PERMISSIONS.USERS_READ)
  async findOne(@Param('id') id: string) {
    return this.usersService.toSummary(await this.usersService.findOne(id));
  }

  @Post()
  @Permissions(PERMISSIONS.USERS_WRITE)
  async create(@Body() dto: CreateUserDto, @CurrentUser() currentUser: AuthenticatedUser) {
    const created = await this.usersService.create(dto, new Types.ObjectId(currentUser.estudioId));
    return this.usersService.toSummary(created);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.USERS_WRITE)
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.toSummary(await this.usersService.update(id, dto));
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.USERS_WRITE)
  remove(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }
}
