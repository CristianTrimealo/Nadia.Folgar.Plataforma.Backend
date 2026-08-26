import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AsistenteIaService } from './asistente-ia.service';
import { MensajeAsistente, RolMensaje } from './schemas/mensaje-asistente.schema';
import { AiChatStubAdapter } from './adapters/ai-chat-stub.adapter';
import { AnthropicChatAdapter } from './adapters/anthropic-chat.adapter';
import { OpenAiChatAdapter } from './adapters/openai-chat.adapter';
import { AiProviderResolverService } from '../configuracion/ai-provider-resolver.service';
import { ProveedorIA } from '../common/enums/proveedor-ia.enum';

describe('AsistenteIaService', () => {
  let service: AsistenteIaService;
  const userId = new Types.ObjectId();
  const estudioId = new Types.ObjectId();

  const mensajeModelMock: any = {
    find: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
  };
  // Default: el resolver no encuentra nada conectado en Configuración →
  // Integraciones (mismo comportamiento previo a ese módulo) — cae al stub.
  const stubAdapterMock = { responder: jest.fn() };
  const anthropicAdapterMock = { responder: jest.fn() };
  const openAiAdapterMock = { responder: jest.fn() };
  const aiProviderResolverServiceMock = { resolver: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    aiProviderResolverServiceMock.resolver.mockResolvedValue(null);

    const moduleRef = await Test.createTestingModule({
      providers: [
        AsistenteIaService,
        { provide: getModelToken(MensajeAsistente.name), useValue: mensajeModelMock },
        { provide: AiChatStubAdapter, useValue: stubAdapterMock },
        { provide: AnthropicChatAdapter, useValue: anthropicAdapterMock },
        { provide: OpenAiChatAdapter, useValue: openAiAdapterMock },
        { provide: AiProviderResolverService, useValue: aiProviderResolverServiceMock },
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
    stubAdapterMock.responder.mockResolvedValue({ respuesta: 'Respuesta simulada' });

    const resultado = await service.enviarMensaje('¿Cómo cargo un vencimiento?', userId, estudioId);

    expect(aiProviderResolverServiceMock.resolver).toHaveBeenCalledWith(estudioId);
    expect(stubAdapterMock.responder).toHaveBeenCalledWith(
      '¿Cómo cargo un vencimiento?',
      expect.arrayContaining([
        expect.objectContaining({ rol: 'asistente', contenido: 'respuesta previa' }),
      ]),
      undefined,
    );
    expect(mensajeModelMock.create).toHaveBeenCalledTimes(2);
    expect(resultado.mensajeAsistente.contenido).toBe('Respuesta simulada');
  });

  it('usa el adapter y la credencial que resuelva AiProviderResolverService (sin override de cliente)', async () => {
    mensajeModelMock.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
      }),
    });
    mensajeModelMock.create
      .mockResolvedValueOnce({ rol: RolMensaje.USUARIO, contenido: 'hola' })
      .mockResolvedValueOnce({ rol: RolMensaje.ASISTENTE, contenido: 'respuesta real' });
    aiProviderResolverServiceMock.resolver.mockResolvedValue({
      proveedor: ProveedorIA.OPENAI,
      apiKey: 'sk-proj-real',
      modelo: 'gpt-5.1',
    });
    openAiAdapterMock.responder.mockResolvedValue({ respuesta: 'respuesta real' });

    await service.enviarMensaje('hola', userId, estudioId);

    expect(openAiAdapterMock.responder).toHaveBeenCalledWith('hola', [], {
      apiKey: 'sk-proj-real',
      modelo: 'gpt-5.1',
    });
    expect(anthropicAdapterMock.responder).not.toHaveBeenCalled();
    expect(stubAdapterMock.responder).not.toHaveBeenCalled();
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
