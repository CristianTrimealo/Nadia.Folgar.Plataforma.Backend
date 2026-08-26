import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MensajeAsistente, MensajeAsistenteSchema } from './schemas/mensaje-asistente.schema';
import { AsistenteIaService } from './asistente-ia.service';
import { AsistenteIaController } from './asistente-ia.controller';
import { AiChatStubAdapter } from './adapters/ai-chat-stub.adapter';
import { AnthropicChatAdapter } from './adapters/anthropic-chat.adapter';
import { OpenAiChatAdapter } from './adapters/openai-chat.adapter';
import { ConfiguracionModule } from '../configuracion/configuracion.module';

/**
 * PROVEEDOR DE IA: `AsistenteIaService` inyecta los tres adapters
 * (Anthropic/OpenAI/Stub) directo y resuelve cuál usar vía
 * `AiProviderResolverService` (`ConfiguracionModule` — Configuración →
 * Integraciones, con fallback a `AI_PROVIDER` de entorno y, sin nada
 * configurado, al stub) — reemplaza el `AI_CHAT_PORT` fijo que tenía antes.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: MensajeAsistente.name, schema: MensajeAsistenteSchema }]),
    ConfiguracionModule,
  ],
  controllers: [AsistenteIaController],
  providers: [AsistenteIaService, AnthropicChatAdapter, OpenAiChatAdapter, AiChatStubAdapter],
  exports: [AsistenteIaService],
})
export class AsistenteIaModule {}
