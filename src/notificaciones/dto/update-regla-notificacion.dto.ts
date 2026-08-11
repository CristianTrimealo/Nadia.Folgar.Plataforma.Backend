import { PartialType } from '@nestjs/swagger';
import { CreateReglaNotificacionDto } from './create-regla-notificacion.dto';

export class UpdateReglaNotificacionDto extends PartialType(CreateReglaNotificacionDto) {}
