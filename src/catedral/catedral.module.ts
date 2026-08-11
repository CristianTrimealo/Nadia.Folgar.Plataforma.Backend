import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatedralSyncLog, CatedralSyncLogSchema } from './schemas/catedral-sync-log.schema';
import { CatedralService } from './catedral.service';
import { CatedralController } from './catedral.controller';
import { CATEDRAL_SYNC_PORT } from './ports/catedral-sync.port';
import { CatedralFileStubAdapter } from './adapters/catedral-file-stub.adapter';

/**
 * Módulo "Integración con Catedral" (backlog FOLGAR-028 a FOLGAR-032).
 *
 * Deliberadamente NO se importa en `AppModule` todavía — esa integración
 * queda a cargo de otro paso posterior.
 *
 * El provider de `CATEDRAL_SYNC_PORT` apunta hoy a `CatedralFileStubAdapter`
 * porque FOLGAR-029 (API vs. exportación/importación de archivos vs. otra
 * vía) todavía no está decidido con el cliente. Cuando se decida, alcanza con
 * reemplazar el `useClass` de este provider por el adapter real —
 * `CatedralService` y `CatedralController` no deberían requerir cambios.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: CatedralSyncLog.name, schema: CatedralSyncLogSchema }]),
  ],
  controllers: [CatedralController],
  providers: [CatedralService, { provide: CATEDRAL_SYNC_PORT, useClass: CatedralFileStubAdapter }],
  exports: [CatedralService],
})
export class CatedralModule {}
