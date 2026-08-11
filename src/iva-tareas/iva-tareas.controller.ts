import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { IvaTareasService } from './iva-tareas.service';
import { CreateTareaPresentacionDto } from './dto/create-tarea-presentacion.dto';
import { UpdateTareaPresentacionDto } from './dto/update-tarea-presentacion.dto';
import { QueryTareaPresentacionDto } from './dto/query-tarea-presentacion.dto';
import { QueryKanbanDto } from './dto/query-kanban.dto';
import { MoverTareaDto } from './dto/mover-tarea.dto';
import { GenerarTareasDto } from './dto/generar-tareas.dto';

@ApiTags('iva-tareas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('iva-tareas')
export class IvaTareasController {
  constructor(private readonly ivaTareasService: IvaTareasService) {}

  @Get('kanban')
  @Permissions(PERMISSIONS.IVA_TAREAS_READ)
  findKanban(@Query() query: QueryKanbanDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ivaTareasService.findKanban(new Types.ObjectId(user.estudioId), query);
  }

  @Get()
  @Permissions(PERMISSIONS.IVA_TAREAS_READ)
  findAll(@Query() query: QueryTareaPresentacionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ivaTareasService.findAllTareas(query, new Types.ObjectId(user.estudioId));
  }

  @Get(':id')
  @Permissions(PERMISSIONS.IVA_TAREAS_READ)
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ivaTareasService.findOneTarea(id, new Types.ObjectId(user.estudioId));
  }

  @Post()
  @Permissions(PERMISSIONS.IVA_TAREAS_WRITE)
  create(@Body() dto: CreateTareaPresentacionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ivaTareasService.createTarea(dto, new Types.ObjectId(user.estudioId));
  }

  @Post('generar')
  @Permissions(PERMISSIONS.IVA_TAREAS_WRITE)
  generar(@Body() dto: GenerarTareasDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ivaTareasService.generarTareasDelMes(
      dto.periodo,
      new Types.ObjectId(user.estudioId),
    );
  }

  @Patch(':id/mover')
  @Permissions(PERMISSIONS.IVA_TAREAS_WRITE)
  mover(
    @Param('id') id: string,
    @Body() dto: MoverTareaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ivaTareasService.moverTarea(id, dto, new Types.ObjectId(user.estudioId));
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.IVA_TAREAS_WRITE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTareaPresentacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ivaTareasService.updateTarea(id, dto, new Types.ObjectId(user.estudioId));
  }
}
