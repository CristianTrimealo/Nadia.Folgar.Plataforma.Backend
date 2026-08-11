import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AI_CHAT_PORT, AiChatPort } from './ports/ai-chat.port';
import {
  MensajeAsistente,
  MensajeAsistenteDocument,
  RolMensaje,
} from './schemas/mensaje-asistente.schema';

/** Cuántos mensajes previos del usuario se mandan como contexto al puerto de IA. */
const TAMANIO_HISTORIAL = 10;

@Injectable()
export class AsistenteIaService {
  constructor(
    @InjectModel(MensajeAsistente.name)
    private readonly mensajeModel: Model<MensajeAsistenteDocument>,
    @Inject(AI_CHAT_PORT) private readonly aiChatPort: AiChatPort,
  ) {}

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

    const resultado = await this.aiChatPort.responder(
      pregunta,
      historialPrevio.reverse().map((m) => ({
        rol: m.rol === RolMensaje.USUARIO ? ('usuario' as const) : ('asistente' as const),
        contenido: m.contenido,
      })),
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
