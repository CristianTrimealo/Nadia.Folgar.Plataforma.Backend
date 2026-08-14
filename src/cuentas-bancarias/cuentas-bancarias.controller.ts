import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CuentasBancariasService } from './cuentas-bancarias.service';
import { CreateCuentaBancariaDto } from './dto/create-cuenta-bancaria.dto';
import { UpdateCuentaBancariaDto } from './dto/update-cuenta-bancaria.dto';
import { QueryCuentaBancariaDto } from './dto/query-cuenta-bancaria.dto';

@ApiTags('cuentas-bancarias')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('cuentas-bancarias')
export class CuentasBancariasController {
  constructor(private readonly cuentasBancariasService: CuentasBancariasService) {}

  @Get()
  @Permissions(PERMISSIONS.EXTRACTOS_CUENTAS_READ)
  findAll(@Query() query: QueryCuentaBancariaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.cuentasBancariasService.findAll(query, new Types.ObjectId(user.estudioId));
  }

  @Get(':id')
  @Permissions(PERMISSIONS.EXTRACTOS_CUENTAS_READ)
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.cuentasBancariasService.findOne(id, new Types.ObjectId(user.estudioId));
  }

  @Post()
  @Permissions(PERMISSIONS.EXTRACTOS_CUENTAS_WRITE)
  create(@Body() dto: CreateCuentaBancariaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.cuentasBancariasService.create(dto, new Types.ObjectId(user.estudioId));
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.EXTRACTOS_CUENTAS_WRITE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCuentaBancariaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cuentasBancariasService.update(id, dto, new Types.ObjectId(user.estudioId));
  }
}
