import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AsistenteIaService } from './asistente-ia.service';
import { MensajeAsistente, RolMensaje } from './schemas/mensaje-asistente.schema';
import { AI_CHAT_PORT } from './ports/ai-chat.port';

describe('AsistenteIaService', () => {
  let service: AsistenteIaService;
  const userId = new Types.ObjectId();
  const estudioId = new Types.ObjectId();

  const mensajeModelMock: any = {
    find: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
  };
  const portMock = { responder: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AsistenteIaService,
        { provide: getModelToken(MensajeAsistente.name), useValue: mensajeModelMock },
        { provide: AI_CHAT_PORT, useValue: portMock },
      ],
    }).compile();

    service = moduleRef.get(AsistenteIaService);
  });

  it('guarda el mensaje del usuario y la respuesta del asistente, y le pasa el historial al puerto', async () => {
    mensajeModelMock.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            { rol: RolMensaje.USUARIO, contenido: 'pregunta previa' },
            { rol: RolMensaje.ASISTENTE, contenido: 'respuesta previa' },
          ]),
        }),
      }),
    });
    mensajeModelMock.create
      .mockResolvedValueOnce({ rol: RolMensaje.USUARIO, contenido: '¿Cómo cargo un vencimiento?' })
      .mockResolvedValueOnce({ rol: RolMensaje.ASISTENTE, contenido: 'Respuesta simulada' });
    portMock.responder.mockResolvedValue({ respuesta: 'Respuesta simulada' });

    const resultado = await service.enviarMensaje('¿Cómo cargo un vencimiento?', userId, estudioId);

    expect(portMock.responder).toHaveBeenCalledWith(
      '¿Cómo cargo un vencimiento?',
      expect.arrayContaining([
        expect.objectContaining({ rol: 'asistente', contenido: 'respuesta previa' }),
      ]),
    );
    expect(mensajeModelMock.create).toHaveBeenCalledTimes(2);
    expect(resultado.mensajeAsistente.contenido).toBe('Respuesta simulada');
  });

  it('marcarFeedback lanza NotFoundException si el mensaje no existe', async () => {
    mensajeModelMock.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.marcarFeedback('id-inexistente', true, estudioId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('marcarFeedback persiste el valor de util', async () => {
    const save = jest.fn();
    mensajeModelMock.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ util: null, save }),
    });

    const mensaje = await service.marcarFeedback('id-1', false, estudioId);

    expect(mensaje.util).toBe(false);
    expect(save).toHaveBeenCalled();
  });
});
