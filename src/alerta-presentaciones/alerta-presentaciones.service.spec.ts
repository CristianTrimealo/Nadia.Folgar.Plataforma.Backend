import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AlertaPresentacionesService } from './alerta-presentaciones.service';
import { ARCA_MONITOR_PORT } from './ports/arca-monitor.port';
import { MESSAGING_PROVIDER } from '../notificaciones/ports/messaging-provider.port';
import { NovedadFiscal, NovedadFiscalEstado } from './schemas/novedad-fiscal.schema';
import { Cliente } from '../clientes/schemas/cliente.schema';

/** Mock encadenable: soporta tanto `.find(f).exec()` como `.find(f).sort().skip().limit().exec()`. */
function chainable(result: unknown): any {
  const query: any = {};
  query.sort = jest.fn().mockReturnValue(query);
  query.skip = jest.fn().mockReturnValue(query);
  query.limit = jest.fn().mockReturnValue(query);
  query.exec = jest.fn().mockResolvedValue(result);
  return query;
}

describe('AlertaPresentacionesService', () => {
  let service: AlertaPresentacionesService;
  const estudioId = new Types.ObjectId();
  const clienteId = new Types.ObjectId();

  const novedadFiscalModelMock: any = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    exists: jest.fn(),
    countDocuments: jest.fn(),
  };
  const clienteModelMock: any = {
    find: jest.fn(),
  };
  const arcaMonitorPortMock: any = {
    consultarNovedades: jest.fn(),
  };
  const messagingProviderMock: any = {
    sendMessage: jest.fn().mockResolvedValue(undefined),
    sendTemplateMessage: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AlertaPresentacionesService,
        { provide: getModelToken(NovedadFiscal.name), useValue: novedadFiscalModelMock },
        { provide: getModelToken(Cliente.name), useValue: clienteModelMock },
        { provide: ARCA_MONITOR_PORT, useValue: arcaMonitorPortMock },
        { provide: MESSAGING_PROVIDER, useValue: messagingProviderMock },
      ],
    }).compile();

    service = moduleRef.get(AlertaPresentacionesService);
  });

  describe('monitorearTodos — deduplicación por referenciaExterna', () => {
    const clienteDoc: any = {
      _id: clienteId,
      nombre: 'Cliente Test',
      cuit: '20111111112',
      email: 'cliente@test.com.ar',
      activo: true,
      estudioId,
    };

    beforeEach(() => {
      clienteModelMock.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([clienteDoc]) });
    });

    it('crea una sola NovedadFiscal cuando el puerto devuelve la misma novedad dos veces', async () => {
      const novedad = {
        referenciaExterna: 'ARCA-STUB-0001',
        descripcion: 'Novedad de prueba',
        fecha: new Date('2026-08-01'),
      };
      // El puerto (mockeado) devuelve la MISMA novedad dos veces en una sola consulta.
      arcaMonitorPortMock.consultarNovedades.mockResolvedValue([novedad, novedad]);

      // Primera verificación de existencia: todavía no existe -> se crea.
      // Segunda verificación (para la novedad duplicada): ya existe -> se omite.
      novedadFiscalModelMock.exists
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }) });

      novedadFiscalModelMock.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        ...novedad,
        clienteId,
        estudioId,
        estado: NovedadFiscalEstado.NUEVA,
      });

      const resultado = await service.monitorearTodos();

      expect(novedadFiscalModelMock.exists).toHaveBeenCalledTimes(2);
      expect(novedadFiscalModelMock.exists).toHaveBeenCalledWith(
        expect.objectContaining({
          estudioId,
          clienteId,
          referenciaExterna: 'ARCA-STUB-0001',
        }),
      );
      expect(novedadFiscalModelMock.create).toHaveBeenCalledTimes(1);
      expect(resultado).toEqual({
        clientesRevisados: 1,
        novedadesDetectadas: 2,
        novedadesNuevas: 1,
        errores: 0,
      });
      expect(messagingProviderMock.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('no crea nada cuando el puerto no detecta novedades (comportamiento del stub actual)', async () => {
      arcaMonitorPortMock.consultarNovedades.mockResolvedValue([]);

      const resultado = await service.monitorearTodos();

      expect(novedadFiscalModelMock.create).not.toHaveBeenCalled();
      expect(messagingProviderMock.sendMessage).not.toHaveBeenCalled();
      expect(resultado).toEqual({
        clientesRevisados: 1,
        novedadesDetectadas: 0,
        novedadesNuevas: 0,
        errores: 0,
      });
    });

    it('cuenta el error y sigue si el puerto lanza una excepción para un cliente', async () => {
      arcaMonitorPortMock.consultarNovedades.mockRejectedValue(new Error('timeout'));

      const resultado = await service.monitorearTodos();

      expect(resultado).toEqual({
        clientesRevisados: 1,
        novedadesDetectadas: 0,
        novedadesNuevas: 0,
        errores: 1,
      });
      expect(novedadFiscalModelMock.create).not.toHaveBeenCalled();
    });
  });

  describe('marcarComoResuelta', () => {
    it('actualiza el estado a resuelta y persiste', async () => {
      const novedadDoc: any = {
        _id: new Types.ObjectId(),
        estado: NovedadFiscalEstado.NUEVA,
        estudioId,
        save: jest.fn().mockResolvedValue(undefined),
      };
      novedadFiscalModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(novedadDoc),
      });

      const result = await service.marcarComoResuelta(novedadDoc._id.toString(), estudioId);

      expect(novedadDoc.estado).toBe(NovedadFiscalEstado.RESUELTA);
      expect(novedadDoc.save).toHaveBeenCalledTimes(1);
      expect(result).toBe(novedadDoc);
    });

    it('lanza NotFoundException si la novedad no existe en el estudio', async () => {
      novedadFiscalModelMock.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(
        service.marcarComoResuelta(new Types.ObjectId().toString(), estudioId),
      ).rejects.toThrow('Novedad fiscal no encontrada');
    });
  });

  describe('marcarComoVista', () => {
    it('actualiza el estado a vista y persiste', async () => {
      const novedadDoc: any = {
        _id: new Types.ObjectId(),
        estado: NovedadFiscalEstado.NUEVA,
        estudioId,
        save: jest.fn().mockResolvedValue(undefined),
      };
      novedadFiscalModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(novedadDoc),
      });

      await service.marcarComoVista(novedadDoc._id.toString(), estudioId);

      expect(novedadDoc.estado).toBe(NovedadFiscalEstado.VISTA);
      expect(novedadDoc.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('devuelve el shape paginado {data,total,page,limit} filtrando por estudioId', async () => {
      const novedades = [{ _id: new Types.ObjectId(), descripcion: 'novedad x' }];
      novedadFiscalModelMock.find.mockReturnValue(chainable(novedades));
      novedadFiscalModelMock.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const result = await service.findAll({ page: 1, limit: 10 }, estudioId);

      expect(novedadFiscalModelMock.find).toHaveBeenCalledWith(
        expect.objectContaining({ estudioId }),
      );
      expect(result).toEqual({ data: novedades, total: 1, page: 1, limit: 10 });
    });

    it('aplica el filtro por clienteId y estado cuando se pasan', async () => {
      novedadFiscalModelMock.find.mockReturnValue(chainable([]));
      novedadFiscalModelMock.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await service.findAll(
        { page: 1, limit: 10, clienteId: clienteId.toString(), estado: NovedadFiscalEstado.NUEVA },
        estudioId,
      );

      expect(novedadFiscalModelMock.find).toHaveBeenCalledWith(
        expect.objectContaining({ estudioId, estado: NovedadFiscalEstado.NUEVA }),
      );
    });
  });
});
