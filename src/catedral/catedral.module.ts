import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatedralSyncLog, CatedralSyncLogSchema } from './schemas/catedral-sync-log.schema';
import { CatedralService } from './catedral.service';
import { CatedralController } from './catedral.controller';
import { CATEDRAL_SYNC_PORT } from './ports/catedral-sync.port';
import { CatedralFileStubAdapter } from './adapters/catedral-file-stub.adapter';
import { CatedralFileAdapter } from './adapters/catedral-file.adapter';
import { ExtractosIaModule } from '../extractos-ia/extractos-ia.module';
import { AsientosContablesModule } from '../asientos-contables/asientos-contables.module';

/**
 * Módulo "Integración con Catedral" (backlog FOLGAR-028 a FOLGAR-032).
 *
 * FOLGAR-029 (API vs. exportación/importación de archivos vs. otra vía) se
 * resolvió: el instructivo interno del estudio ("Importar asientos... a
 * Catedral.docx") confirma que la vía es exportación/importación de archivo
 * Excel, no API — Catedral genera su propia planilla, se completa y se
 * re-importa. `CatedralFileAdapter` implementa esa vía para
 * `exportarAsientoContable`; `exportarClientes`/`importarMovimientos` siguen
 * sin vía definida. `CatedralFileStubAdapter` se mantiene en el repo (sigue
 * cubierto por su propio test) por si hace falta volver al comportamiento
 * 100% simulado — alcanza con cambiar el `useClass` de este provider.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: CatedralSyncLog.name, schema: CatedralSyncLogSchema }]),
    ExtractosIaModule,
    AsientosContablesModule,
  ],
  controllers: [CatedralController],
  providers: [
    CatedralService,
    CatedralFileStubAdapter,
    { provide: CATEDRAL_SYNC_PORT, useClass: CatedralFileAdapter },
  ],
  exports: [CatedralService],
})
export class CatedralModule {}
