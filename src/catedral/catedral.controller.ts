import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UnprocessableEntityException,
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
import { CatedralService } from './catedral.service';
import { SyncCatedralDto } from './dto/sync-catedral.dto';
import { QueryCatedralSyncLogDto } from './dto/query-catedral-sync-log.dto';
import { ExportarAsientoDto } from './dto/exportar-asiento.dto';
import { CatedralSyncOperacion } from './schemas/catedral-sync-log.schema';

@ApiTags('catedral')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('catedral')
export class CatedralController {
  constructor(private readonly catedralService: CatedralService) {}

  /**
   * Dispara una sincronización manual con Catedral. Mientras FOLGAR-029 (vía
   * de integración) no esté resuelto con el cliente, esto ejecuta el adapter
   * stub — ver CatedralFileStubAdapter — no hay integración real todavía.
   */
  @Post('sync')
  @Permissions(PERMISSIONS.CATEDRAL_WRITE)
  sync(@Body() dto: SyncCatedralDto, @CurrentUser() user: AuthenticatedUser) {
    const estudioId = new Types.ObjectId(user.estudioId);
    if (dto.operacion === CatedralSyncOperacion.IMPORTAR_MOVIMIENTOS) {
      return this.catedralService.importarMovimientos(dto.origen, estudioId);
    }
    return this.catedralService.exportarClientes(estudioId);
  }

  /**
   * Arma el asiento contable del extracto (fuente autoritativa server-side,
   * no la vista previa del Frontend) y devuelve la planilla lista para
   * importar en Catedral. 422 si el asiento no cuadra o quedan movimientos
   * sin clasificar — nunca se genera un archivo a medio validar.
   */
  @Post('asientos/:extractoId/exportar')
  @Permissions(PERMISSIONS.EXTRACTOS_READ, PERMISSIONS.CATEDRAL_WRITE)
  async exportarAsiento(
    @Param('extractoId') extractoId: string,
    @Body() dto: ExportarAsientoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const resultado = await this.catedralService.exportarAsientoContable(
      extractoId,
      new Types.ObjectId(user.estudioId),
      dto.asignacionesManuales,
    );

    if (!resultado.exitoso || !resultado.archivo) {
      throw new UnprocessableEntityException({
        message: resultado.mensaje,
        validacion: resultado.validacion,
      });
    }

    return resultado.archivo;
  }

  @Get('sync-logs')
  @Permissions(PERMISSIONS.CATEDRAL_READ)
  findLogs(@Query() query: QueryCatedralSyncLogDto, @CurrentUser() user: AuthenticatedUser) {
    return this.catedralService.findLogs(query, new Types.ObjectId(user.estudioId));
  }
}
