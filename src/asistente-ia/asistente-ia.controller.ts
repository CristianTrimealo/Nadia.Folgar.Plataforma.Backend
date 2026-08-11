import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { AsistenteIaService } from './asistente-ia.service';
import { EnviarMensajeDto } from './dto/enviar-mensaje.dto';
import { FeedbackMensajeDto } from './dto/feedback-mensaje.dto';

@ApiTags('asistente-ia')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('asistente-ia')
export class AsistenteIaController {
  constructor(private readonly asistenteIaService: AsistenteIaService) {}

  @Get('historial')
  @Permissions(PERMISSIONS.ASISTENTE_IA_USO)
  historial(@CurrentUser() user: AuthenticatedUser) {
    return this.asistenteIaService.findHistorial(
      new Types.ObjectId(user.userId),
      new Types.ObjectId(user.estudioId),
    );
  }

  @Post('mensajes')
  @Permissions(PERMISSIONS.ASISTENTE_IA_USO)
  enviarMensaje(@Body() dto: EnviarMensajeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.asistenteIaService.enviarMensaje(
      dto.pregunta,
      new Types.ObjectId(user.userId),
      new Types.ObjectId(user.estudioId),
    );
  }

  @Patch('mensajes/:id/feedback')
  @Permissions(PERMISSIONS.ASISTENTE_IA_USO)
  feedback(
    @Param('id') id: string,
    @Body() dto: FeedbackMensajeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.asistenteIaService.marcarFeedback(id, dto.util, new Types.ObjectId(user.estudioId));
  }
}
