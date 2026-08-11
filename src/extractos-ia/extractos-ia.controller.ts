import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { ExtractosIaService } from './extractos-ia.service';
import { CreateExtractoDto } from './dto/create-extracto.dto';
import { UpdateMovimientosDto } from './dto/update-movimientos.dto';
import { QueryExtractoDto } from './dto/query-extracto.dto';

@ApiTags('extractos-ia')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('extractos-ia')
export class ExtractosIaController {
  constructor(private readonly extractosIaService: ExtractosIaService) {}

  /** Carga el PDF (base64) y lo procesa de forma síncrona contra el puerto de IA. */
  @Post()
  @Permissions(PERMISSIONS.EXTRACTOS_WRITE)
  cargar(@Body() dto: CreateExtractoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.extractosIaService.cargarExtracto(dto, new Types.ObjectId(user.estudioId));
  }

  @Get()
  @Permissions(PERMISSIONS.EXTRACTOS_READ)
  findAll(@Query() query: QueryExtractoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.extractosIaService.findAll(query, new Types.ObjectId(user.estudioId));
  }

  @Get(':id')
  @Permissions(PERMISSIONS.EXTRACTOS_READ)
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.extractosIaService.findOne(id, new Types.ObjectId(user.estudioId));
  }

  /** Edición manual de los movimientos extraídos antes de confirmarlos (checklist FOLGAR-009). */
  @Patch(':id/movimientos')
  @Permissions(PERMISSIONS.EXTRACTOS_WRITE)
  actualizarMovimientos(
    @Param('id') id: string,
    @Body() dto: UpdateMovimientosDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.extractosIaService.actualizarMovimientos(
      id,
      dto.movimientos,
      new Types.ObjectId(user.estudioId),
    );
  }
}
