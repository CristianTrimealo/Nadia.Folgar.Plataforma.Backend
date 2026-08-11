import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { QueryClienteDto } from './dto/query-cliente.dto';

@ApiTags('clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Get()
  @Permissions(PERMISSIONS.CLIENTES_READ)
  findAll(@Query() query: QueryClienteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.clientesService.findAll(query, new Types.ObjectId(user.estudioId));
  }

  @Get(':id')
  @Permissions(PERMISSIONS.CLIENTES_READ)
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.clientesService.findOne(id, new Types.ObjectId(user.estudioId));
  }

  @Post()
  @Permissions(PERMISSIONS.CLIENTES_WRITE)
  create(@Body() dto: CreateClienteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.clientesService.create(dto, new Types.ObjectId(user.estudioId));
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.CLIENTES_WRITE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClienteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.clientesService.update(id, dto, new Types.ObjectId(user.estudioId));
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.CLIENTES_WRITE)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.clientesService.deactivate(id, new Types.ObjectId(user.estudioId));
  }
}
