import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { FacturacionElectronicaService } from './facturacion-electronica.service';
import { CreateFacturaDto } from './dto/create-factura.dto';
import { AprobarFacturaDto } from './dto/aprobar-factura.dto';
import { RechazarFacturaDto } from './dto/rechazar-factura.dto';
import { QueryFacturaDto } from './dto/query-factura.dto';

@ApiTags('facturacion-electronica')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('facturacion-electronica')
export class FacturacionElectronicaController {
  constructor(private readonly facturacionService: FacturacionElectronicaService) {}

  @Get()
  @Permissions(PERMISSIONS.FACTURACION_READ)
  findAll(@Query() query: QueryFacturaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.facturacionService.findAll(query, new Types.ObjectId(user.estudioId));
  }

  @Get(':id')
  @Permissions(PERMISSIONS.FACTURACION_READ)
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.facturacionService.findOne(id, new Types.ObjectId(user.estudioId));
  }

  @Post()
  @Permissions(PERMISSIONS.FACTURACION_WRITE)
  crearPrefactura(@Body() dto: CreateFacturaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.facturacionService.crearPrefactura(dto, new Types.ObjectId(user.estudioId));
  }

  @Patch(':id/aprobar')
  @Permissions(PERMISSIONS.FACTURACION_APROBAR)
  aprobar(
    @Param('id') id: string,
    @Body() dto: AprobarFacturaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.facturacionService.aprobar(
      id,
      dto,
      new Types.ObjectId(user.userId),
      new Types.ObjectId(user.estudioId),
    );
  }

  @Patch(':id/rechazar')
  @Permissions(PERMISSIONS.FACTURACION_APROBAR)
  rechazar(
    @Param('id') id: string,
    @Body() dto: RechazarFacturaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.facturacionService.rechazar(id, dto, new Types.ObjectId(user.estudioId));
  }

  @Patch(':id/emitir')
  @Permissions(PERMISSIONS.FACTURACION_APROBAR)
  emitir(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.facturacionService.emitir(id, new Types.ObjectId(user.estudioId));
  }

  @Patch(':id/pagada')
  @Permissions(PERMISSIONS.FACTURACION_WRITE)
  marcarComoPagada(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.facturacionService.marcarComoPagada(id, new Types.ObjectId(user.estudioId));
  }
}
