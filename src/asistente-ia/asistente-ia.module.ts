import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MensajeAsistente, MensajeAsistenteSchema } from './schemas/mensaje-asistente.schema';
import { AsistenteIaService } from './asistente-ia.service';
import { AsistenteIaController } from './asistente-ia.controller';
import { AI_CHAT_PORT } from './ports/ai-chat.port';
import { AiChatStubAdapter } from './adapters/ai-chat-stub.adapter';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: MensajeAsistente.name, schema: MensajeAsistenteSchema }]),
  ],
  controllers: [AsistenteIaController],
  providers: [AsistenteIaService, { provide: AI_CHAT_PORT, useClass: AiChatStubAdapter }],
  exports: [AsistenteIaService],
})
export class AsistenteIaModule {}
