import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { PlanCuentasService } from './plan-cuentas.service';
import { CreateCuentaContableDto } from './dto/create-cuenta-contable.dto';
import { UpdateCuentaContableDto } from './dto/update-cuenta-contable.dto';
import { QueryCuentaContableDto } from './dto/query-cuenta-contable.dto';

@ApiTags('plan-cuentas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('plan-cuentas')
export class PlanCuentasController {
  constructor(private readonly planCuentasService: PlanCuentasService) {}

  @Get()
  @Permissions(PERMISSIONS.EXTRACTOS_PLAN_CUENTAS_READ)
  findAll(@Query() query: QueryCuentaContableDto, @CurrentUser() user: AuthenticatedUser) {
    return this.planCuentasService.findAll(query, new Types.ObjectId(user.estudioId));
  }

  @Get(':id')
  @Permissions(PERMISSIONS.EXTRACTOS_PLAN_CUENTAS_READ)
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.planCuentasService.findOne(id, new Types.ObjectId(user.estudioId));
  }

  @Post()
  @Permissions(PERMISSIONS.EXTRACTOS_PLAN_CUENTAS_WRITE)
  create(@Body() dto: CreateCuentaContableDto, @CurrentUser() user: AuthenticatedUser) {
    return this.planCuentasService.create(dto, new Types.ObjectId(user.estudioId));
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.EXTRACTOS_PLAN_CUENTAS_WRITE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCuentaContableDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.planCuentasService.update(id, dto, new Types.ObjectId(user.estudioId));
  }
}
