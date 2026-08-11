import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cliente, ClienteSchema } from '../clientes/schemas/cliente.schema';
import { TareaPresentacion, TareaPresentacionSchema } from './schemas/tarea-presentacion.schema';
import { IvaTareasService } from './iva-tareas.service';
import { IvaTareasController } from './iva-tareas.controller';

/**
 * NOTA: este módulo todavía NO se importa en app.module.ts a propósito —
 * esa integración queda a cargo de otro cambio en paralelo sobre ese mismo
 * archivo, para evitar pisarlo (mismo criterio que NotificacionesModule).
 * Ver FOLGAR-046 a FOLGAR-051.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TareaPresentacion.name, schema: TareaPresentacionSchema },
      { name: Cliente.name, schema: ClienteSchema },
    ]),
  ],
  controllers: [IvaTareasController],
  providers: [IvaTareasService],
  exports: [IvaTareasService],
})
export class IvaTareasModule {}
