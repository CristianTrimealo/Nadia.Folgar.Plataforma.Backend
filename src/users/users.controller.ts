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
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Permissions(PERMISSIONS.USERS_READ)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Permissions(PERMISSIONS.USERS_WRITE)
  create(@Body() dto: CreateUserDto, @CurrentUser() currentUser: AuthenticatedUser) {
    return this.usersService.create(dto, new Types.ObjectId(currentUser.estudioId));
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.USERS_WRITE)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.USERS_WRITE)
  remove(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }
}
