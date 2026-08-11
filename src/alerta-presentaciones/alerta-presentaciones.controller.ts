import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { AlertaPresentacionesService } from './alerta-presentaciones.service';
import { QueryNovedadFiscalDto } from './dto/query-novedad-fiscal.dto';
import { UpdateEstadoNovedadFiscalDto } from './dto/update-estado-novedad-fiscal.dto';

@ApiTags('alerta-presentaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('alerta-presentaciones')
export class AlertaPresentacionesController {
  constructor(private readonly alertaPresentacionesService: AlertaPresentacionesService) {}

  @Get()
  @Permissions(PERMISSIONS.ALERTAS_READ)
  findAll(@Query() query: QueryNovedadFiscalDto, @CurrentUser() user: AuthenticatedUser) {
    return this.alertaPresentacionesService.findAll(query, new Types.ObjectId(user.estudioId));
  }

  @Get(':id')
  @Permissions(PERMISSIONS.ALERTAS_READ)
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.alertaPresentacionesService.findOne(id, new Types.ObjectId(user.estudioId));
  }

  /** Marca una novedad como 'vista' o 'resuelta' (nunca de vuelta a 'nueva' — ver el DTO). */
  @Patch(':id/estado')
  @Permissions(PERMISSIONS.ALERTAS_WRITE)
  actualizarEstado(
    @Param('id') id: string,
    @Body() dto: UpdateEstadoNovedadFiscalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.alertaPresentacionesService.actualizarEstado(
      id,
      dto.estado,
      new Types.ObjectId(user.estudioId),
    );
  }

  /**
   * Disparo manual del monitoreo (además del cron diario) — útil para
   * soporte o para verificar el circuito end-to-end sin esperar al cron.
   * Mientras FOLGAR-040/041 no estén resueltos con el cliente, esto ejecuta
   * el adapter stub — ver `ArcaMonitorStubAdapter` — no hay integración
   * real con ARCA todavía.
   */
  @Post('monitorear')
  @Permissions(PERMISSIONS.ALERTAS_WRITE)
  monitorear() {
    return this.alertaPresentacionesService.monitorearTodos();
  }
}
