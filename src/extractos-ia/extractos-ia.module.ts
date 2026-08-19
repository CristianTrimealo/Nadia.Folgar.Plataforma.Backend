import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { ExtractoBancario, ExtractoBancarioSchema } from './schemas/extracto-bancario.schema';
import { ExtractosIaService } from './extractos-ia.service';
import { ExtractosIaController } from './extractos-ia.controller';
import { ExtractosIaProcessor } from './extractos-ia.processor';
import { AI_EXTRACTION_PORT } from './ports/ai-extraction.port';
import { AiExtractionStubAdapter } from './adapters/ai-extraction-stub.adapter';
import { AnthropicExtractionAdapter } from './adapters/anthropic-extraction.adapter';
import { OpenAiExtractionAdapter } from './adapters/openai-extraction.adapter';
import { PdfTextExtractorService } from './pdf-text-extractor.service';
import { ExtractoDeteccionService } from './extracto-deteccion.service';
import { CuentasBancariasModule } from '../cuentas-bancarias/cuentas-bancarias.module';
import { RealtimeModule } from '../realtime/realtime.module';

/**
 * Módulo "Procesador de Extractos con IA" (backlog FOLGAR-007 a FOLGAR-012,
 * ampliado luego con validación de saldo y procesamiento asíncrono — ver
 * plan de ejecución).
 *
 * DECISIÓN DE SCOPE — carga de archivos: en vez de upload multipart (que
 * requeriría registrar `@fastify/multipart` en `main.ts`, archivo compartido
 * que tampoco corresponde tocar acá), la carga usa un DTO JSON con
 * `nombreArchivo` + `contenidoBase64`. El Frontend convierte el PDF elegido
 * por el usuario a base64 con `FileReader` antes de llamar al endpoint.
 *
 * PROCESAMIENTO ASÍNCRONO: `ExtractosIaService.cargarExtracto` solo valida,
 * crea el documento (`PROCESANDO`) y encola un job en la cola BullMQ
 * `extractos-ia` (Redis, ver `REDIS_URL`) — responde en milisegundos.
 * `ExtractosIaProcessor` es el worker que hace el trabajo pesado (extraer
 * texto, llamar a la IA, validar saldo) fuera de la request HTTP, y notifica
 * el resultado por WebSocket vía `RealtimeGateway` (`RealtimeModule`) cuando
 * termina. Reemplaza el procesamiento 100% síncrono que tenía este módulo
 * antes, que dejó de alcanzar en cuanto la IA empezó a tardar más que el
 * timeout HTTP del Frontend.
 *
 * El provider de `AI_EXTRACTION_PORT` se selecciona por la variable de
 * entorno `AI_PROVIDER` (`stub` por defecto — sin credenciales, para
 * desarrollo/tests; `anthropic` usa Claude Sonnet 5; `openai` usa GPT-5.1).
 * `ExtractosIaService`, `ExtractosIaProcessor` y `ExtractosIaController` no
 * requieren cambios al cambiar de proveedor — solo este factory.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: ExtractoBancario.name, schema: ExtractoBancarioSchema }]),
    BullModule.registerQueue({ name: 'extractos-ia' }),
    CuentasBancariasModule,
    RealtimeModule,
  ],
  controllers: [ExtractosIaController],
  providers: [
    ExtractosIaService,
    ExtractosIaProcessor,
    PdfTextExtractorService,
    ExtractoDeteccionService,
    AiExtractionStubAdapter,
    AnthropicExtractionAdapter,
    OpenAiExtractionAdapter,
    {
      provide: AI_EXTRACTION_PORT,
      useFactory: (
        configService: ConfigService,
        stub: AiExtractionStubAdapter,
        anthropic: AnthropicExtractionAdapter,
        openai: OpenAiExtractionAdapter,
      ) => {
        const provider = configService.get<string>('AI_PROVIDER');
        if (provider === 'anthropic') return anthropic;
        if (provider === 'openai') return openai;
        return stub;
      },
      inject: [
        ConfigService,
        AiExtractionStubAdapter,
        AnthropicExtractionAdapter,
        OpenAiExtractionAdapter,
      ],
    },
  ],
  exports: [ExtractosIaService],
})
export class ExtractosIaModule {}
