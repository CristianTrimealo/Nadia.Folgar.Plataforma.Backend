import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { CatedralService } from './catedral.service';
import { CATEDRAL_SYNC_PORT } from './ports/catedral-sync.port';
import {
  CatedralSyncEstado,
  CatedralSyncLog,
  CatedralSyncOperacion,
} from './schemas/catedral-sync-log.schema';
import { QueryCatedralSyncLogDto } from './dto/query-catedral-sync-log.dto';

describe('CatedralService', () => {
  let service: CatedralService;
  const estudioId = new Types.ObjectId();

  const syncLogModelMock: any = {
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  };

  // Fake que implementa CatedralSyncPort — reemplaza al adapter real (stub o
  // futuro) para probar CatedralService sin depender de ninguna vía concreta.
  const fakePort: any = {
    exportarClientes: jest.fn(),
    importarMovimientos: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CatedralService,
        { provide: CATEDRAL_SYNC_PORT, useValue: fakePort },
        { provide: getModelToken(CatedralSyncLog.name), useValue: syncLogModelMock },
      ],
    }).compile();

    service = moduleRef.get(CatedralService);
  });

  it('registra un log en estado éxito cuando exportarClientes responde exitoso', async () => {
    fakePort.exportarClientes.mockResolvedValue({ exitoso: true, mensaje: 'ok' });
    syncLogModelMock.create.mockResolvedValue({});

    await service.exportarClientes(estudioId);

    expect(fakePort.exportarClientes).toHaveBeenCalledTimes(1);
    expect(syncLogModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        operacion: CatedralSyncOperacion.EXPORTAR_CLIENTES,
        estudioId,
        estado: CatedralSyncEstado.EXITO,
        detalle: 'ok',
      }),
    );
  });

  it('registra un log en estado error cuando importarMovimientos responde no exitoso', async () => {
    fakePort.importarMovimientos.mockResolvedValue({
      exitoso: false,
      mensaje: 'formato de origen inválido',
    });
    syncLogModelMock.create.mockResolvedValue({});

    await service.importarMovimientos({ foo: 'bar' }, estudioId);

    expect(fakePort.importarMovimientos).toHaveBeenCalledWith({ foo: 'bar' });
    expect(syncLogModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        operacion: CatedralSyncOperacion.IMPORTAR_MOVIMIENTOS,
        estudioId,
        estado: CatedralSyncEstado.ERROR,
        detalle: 'formato de origen inválido',
      }),
    );
  });

  it('registra un log en estado error cuando el puerto lanza una excepción', async () => {
    fakePort.exportarClientes.mockRejectedValue(new Error('timeout de red'));
    syncLogModelMock.create.mockResolvedValue({});

    await service.exportarClientes(estudioId);

    expect(syncLogModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        operacion: CatedralSyncOperacion.EXPORTAR_CLIENTES,
        estudioId,
        estado: CatedralSyncEstado.ERROR,
        detalle: 'timeout de red',
      }),
    );
  });

  it('findLogs devuelve el historial paginado filtrado por estudio', async () => {
    const execMock = jest
      .fn()
      .mockResolvedValue([{ operacion: CatedralSyncOperacion.EXPORTAR_CLIENTES }]);
    syncLogModelMock.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: execMock,
    });
    syncLogModelMock.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });

    const query: QueryCatedralSyncLogDto = { page: 1, limit: 10, sortDir: 'asc' };
    const result = await service.findLogs(query, estudioId);

    expect(syncLogModelMock.find).toHaveBeenCalledWith(expect.objectContaining({ estudioId }));
    expect(result).toEqual({
      data: [{ operacion: CatedralSyncOperacion.EXPORTAR_CLIENTES }],
      total: 1,
      page: 1,
      limit: 10,
    });
  });
});
