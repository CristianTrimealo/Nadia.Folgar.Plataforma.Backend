import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { AiProviderResolverService } from './ai-provider-resolver.service';
import { IntegracionesService } from './integraciones.service';
import { Estudio } from '../tenancy/schemas/estudio.schema';
import { ClientesService } from '../clientes/clientes.service';
import { ProveedorIA } from '../common/enums/proveedor-ia.enum';

describe('AiProviderResolverService', () => {
  let service: AiProviderResolverService;
  const estudioId = new Types.ObjectId();
  const clienteId = new Types.ObjectId();

  const integracionesServiceMock = { obtenerCredencialDescifrada: jest.fn() };
  const estudioModelMock: any = { findById: jest.fn() };
  const clientesServiceMock = { findOne: jest.fn() };
  const configServiceMock = { get: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    integracionesServiceMock.obtenerCredencialDescifrada.mockResolvedValue(null);
    estudioModelMock.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    configServiceMock.get.mockReturnValue(undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        AiProviderResolverService,
        { provide: IntegracionesService, useValue: integracionesServiceMock },
        { provide: getModelToken(Estudio.name), useValue: estudioModelMock },
        { provide: ClientesService, useValue: clientesServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = moduleRef.get(AiProviderResolverService);
  });

  it('nivel 1: usa el motor preferido del cliente, aunque el estudio tenga otro por defecto', async () => {
    clientesServiceMock.findOne.mockResolvedValue({ motorIaPreferido: ProveedorIA.OPENAI });
    estudioModelMock.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ motorIaPorDefecto: ProveedorIA.ANTHROPIC }),
    });
    integracionesServiceMock.obtenerCredencialDescifrada.mockResolvedValue({
      apiKey: 'sk-proj-real',
      modelo: 'gpt-5.1',
    });

    const resultado = await service.resolver(estudioId, clienteId);

    expect(clientesServiceMock.findOne).toHaveBeenCalledWith(clienteId.toString(), estudioId);
    expect(resultado).toEqual({
      proveedor: ProveedorIA.OPENAI,
      apiKey: 'sk-proj-real',
      modelo: 'gpt-5.1',
    });
  });

  it('nivel 2: sin override de cliente (o sin clienteId), usa el motor por defecto del estudio', async () => {
    estudioModelMock.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ motorIaPorDefecto: ProveedorIA.ANTHROPIC }),
    });
    integracionesServiceMock.obtenerCredencialDescifrada.mockResolvedValue({
      apiKey: 'sk-ant-real',
    });

    const resultado = await service.resolver(estudioId);

    expect(clientesServiceMock.findOne).not.toHaveBeenCalled();
    expect(resultado).toEqual({
      proveedor: ProveedorIA.ANTHROPIC,
      apiKey: 'sk-ant-real',
      modelo: undefined,
    });
  });

  it('nivel 2: si el cliente no tiene override, cae al motor por defecto del estudio', async () => {
    clientesServiceMock.findOne.mockResolvedValue({ motorIaPreferido: undefined });
    estudioModelMock.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ motorIaPorDefecto: ProveedorIA.OPENAI }),
    });

    const resultado = await service.resolver(estudioId, clienteId);

    expect(resultado?.proveedor).toBe(ProveedorIA.OPENAI);
  });

  it('nivel 3: sin nada configurado en Configuración, cae a AI_PROVIDER de entorno', async () => {
    configServiceMock.get.mockImplementation((key: string) =>
      key === 'AI_PROVIDER' ? 'anthropic' : undefined,
    );

    const resultado = await service.resolver(estudioId);

    expect(resultado?.proveedor).toBe(ProveedorIA.ANTHROPIC);
    expect(resultado?.apiKey).toBeUndefined();
  });

  it('nivel 4: sin nada configurado y AI_PROVIDER=stub (o vacío), devuelve null', async () => {
    configServiceMock.get.mockImplementation((key: string) =>
      key === 'AI_PROVIDER' ? 'stub' : undefined,
    );

    const resultado = await service.resolver(estudioId);

    expect(resultado).toBeNull();
    expect(integracionesServiceMock.obtenerCredencialDescifrada).not.toHaveBeenCalled();
  });

  it('devuelve el proveedor resuelto sin apiKey si no hay ninguna IntegracionIa conectada para él', async () => {
    estudioModelMock.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ motorIaPorDefecto: ProveedorIA.OPENAI }),
    });
    integracionesServiceMock.obtenerCredencialDescifrada.mockResolvedValue(null);

    const resultado = await service.resolver(estudioId);

    expect(resultado).toEqual({
      proveedor: ProveedorIA.OPENAI,
      apiKey: undefined,
      modelo: undefined,
    });
  });
});
