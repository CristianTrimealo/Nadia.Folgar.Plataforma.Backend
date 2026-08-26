import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AiChatCredenciales, AiChatPort } from './ports/ai-chat.port';
import { AiChatStubAdapter } from './adapters/ai-chat-stub.adapter';
import { AnthropicChatAdapter } from './adapters/anthropic-chat.adapter';
import { OpenAiChatAdapter } from './adapters/openai-chat.adapter';
import {
  MensajeAsistente,
  MensajeAsistenteDocument,
  RolMensaje,
} from './schemas/mensaje-asistente.schema';
import { AiProviderResolverService } from '../configuracion/ai-provider-resolver.service';
import { ProveedorIA } from '../common/enums/proveedor-ia.enum';

/** Cuántos mensajes previos del usuario se mandan como contexto al puerto de IA. */
const TAMANIO_HISTORIAL = 10;

/**
 * PROVEEDOR DE IA: igual que `ExtractosIaProcessor`, ya no depende de un
 * único `AiChatPort` fijo por variable de entorno — inyecta los tres
 * adapters directo y resuelve cuál usar vía `AiProviderResolverService`. El
 * chat no está atado a ningún `Cliente` (es un canal del equipo interno, ver
 * `MensajeAsistente.schema.ts`), así que resuelve solo con `estudioId`
 * (nunca hay override de cliente acá — siempre el motor por defecto del
 * estudio, o el stub si no hay nada conectado).
 */
@Injectable()
export class AsistenteIaService {
  constructor(
    @InjectModel(MensajeAsistente.name)
    private readonly mensajeModel: Model<MensajeAsistenteDocument>,
    private readonly aiProviderResolverService: AiProviderResolverService,
    private readonly anthropicAdapter: AnthropicChatAdapter,
    private readonly openAiAdapter: OpenAiChatAdapter,
    private readonly stubAdapter: AiChatStubAdapter,
  ) {}

  private async resolverAdapter(
    estudioId: Types.ObjectId,
  ): Promise<{ port: AiChatPort; credenciales?: AiChatCredenciales }> {
    const credencial = await this.aiProviderResolverService.resolver(estudioId);
    if (!credencial) {
      return { port: this.stubAdapter };
    }

    const port =
      credencial.proveedor === ProveedorIA.ANTHROPIC ? this.anthropicAdapter : this.openAiAdapter;
    return {
      port,
      credenciales: credencial.apiKey
        ? { apiKey: credencial.apiKey, modelo: credencial.modelo }
        : undefined,
    };
  }

  async findHistorial(
    userId: Types.ObjectId,
    estudioId: Types.ObjectId,
  ): Promise<MensajeAsistenteDocument[]> {
    return this.mensajeModel.find({ userId, estudioId }).sort({ createdAt: 1 }).exec();
  }

  /**
   * Guarda la pregunta del usuario, arma el historial reciente como
   * contexto, llama al puerto (hoy el adapter stub) y guarda la respuesta.
   * Devuelve ambos mensajes para que el Frontend los pueda agregar al chat
   * sin tener que volver a pedir el historial completo.
   */
  async enviarMensaje(
    pregunta: string,
    userId: Types.ObjectId,
    estudioId: Types.ObjectId,
  ): Promise<{
    mensajeUsuario: MensajeAsistenteDocument;
    mensajeAsistente: MensajeAsistenteDocument;
  }> {
    const historialPrevio = await this.mensajeModel
      .find({ userId, estudioId })
      .sort({ createdAt: -1 })
      .limit(TAMANIO_HISTORIAL)
      .exec();

    const mensajeUsuario = await this.mensajeModel.create({
      userId,
      rol: RolMensaje.USUARIO,
      contenido: pregunta,
      estudioId,
    });

    const { port: aiChatPort, credenciales } = await this.resolverAdapter(estudioId);
    const resultado = await aiChatPort.responder(
      pregunta,
      historialPrevio.reverse().map((m) => ({
        rol: m.rol === RolMensaje.USUARIO ? ('usuario' as const) : ('asistente' as const),
        contenido: m.contenido,
      })),
      credenciales,
    );

    const mensajeAsistente = await this.mensajeModel.create({
      userId,
      rol: RolMensaje.ASISTENTE,
      contenido: resultado.respuesta,
      estudioId,
    });

    return { mensajeUsuario, mensajeAsistente };
  }

  async marcarFeedback(
    id: string,
    util: boolean,
    estudioId: Types.ObjectId,
  ): Promise<MensajeAsistenteDocument> {
    const mensaje = await this.mensajeModel.findOne({ _id: id, estudioId }).exec();
    if (!mensaje) {
      throw new NotFoundException('Mensaje no encontrado');
    }
    mensaje.util = util;
    await mensaje.save();
    return mensaje;
  }
}
