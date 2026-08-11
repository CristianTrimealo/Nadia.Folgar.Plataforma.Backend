import { PartialType } from '@nestjs/swagger';
import { CreateTareaPresentacionDto } from './create-tarea-presentacion.dto';

/** Edición de checklist/asignación/estado de una tarea ya generada. */
export class UpdateTareaPresentacionDto extends PartialType(CreateTareaPresentacionDto) {}
