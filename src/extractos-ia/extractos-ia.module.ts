import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExtractoBancario, ExtractoBancarioSchema } from './schemas/extracto-bancario.schema';
import { ExtractosIaService } from './extractos-ia.service';
import { ExtractosIaController } from './extractos-ia.controller';
import { AI_EXTRACTION_PORT } from './ports/ai-extraction.port';
import { AiExtractionStubAdapter } from './adapters/ai-extraction-stub.adapter';

/**
 * Módulo "Procesador de Extractos con IA" (backlog FOLGAR-007 a FOLGAR-012).
 *
 * Deliberadamente NO se importa en `AppModule` todavía — queda a cargo de un
 * paso posterior (ver también nota en `app.module.ts`, que no se debe tocar
 * en este trabajo porque hay otro cambio en paralelo sobre ese archivo).
 *
 * DECISIÓN DE SCOPE — carga de archivos: en vez de upload multipart (que
 * requeriría registrar `@fastify/multipart` en `main.ts`, archivo compartido
 * que tampoco corresponde tocar acá), la carga usa un DTO JSON con
 * `nombreArchivo` + `contenidoBase64`. El Frontend convierte el PDF elegido
 * por el usuario a base64 con `FileReader` antes de llamar al endpoint.
 *
 * DECISIÓN DE SCOPE — procesamiento: `cargarExtracto` es síncrono, no hay
 * cola/worker real. El brief no exige throughput alto para este módulo (un
 * contador sube extractos de a uno) y agregar una cola real hoy sería
 * infraestructura sin necesidad de negocio concreta todavía.
 *
 * El provider de `AI_EXTRACTION_PORT` apunta hoy a `AiExtractionStubAdapter`
 * porque todavía no está confirmado qué proveedor de IA se va a usar. Cuando
 * se confirme, alcanza con reemplazar el `useClass` de este provider por el
 * adapter real — `ExtractosIaService` y `ExtractosIaController` no deberían
 * requerir cambios.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: ExtractoBancario.name, schema: ExtractoBancarioSchema }]),
  ],
  controllers: [ExtractosIaController],
  providers: [
    ExtractosIaService,
    { provide: AI_EXTRACTION_PORT, useClass: AiExtractionStubAdapter },
  ],
  exports: [ExtractosIaService],
})
export class ExtractosIaModule {}
