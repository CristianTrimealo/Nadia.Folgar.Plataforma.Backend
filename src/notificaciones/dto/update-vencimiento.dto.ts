import { PartialType } from '@nestjs/swagger';
import { CreateVencimientoDto } from './create-vencimiento.dto';

export class UpdateVencimientoDto extends PartialType(CreateVencimientoDto) {}
