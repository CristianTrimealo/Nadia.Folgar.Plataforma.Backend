import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ExtractosIaService } from './extractos-ia.service';
import { AI_EXTRACTION_PORT } from './ports/ai-extraction.port';
import { EstadoExtracto, ExtractoBancario } from './schemas/extracto-bancario.schema';

describe('ExtractosIaService', () => {
  let service: ExtractosIaService;
  const estudioId = new Types.ObjectId();
  const clienteId = new Types.ObjectId().toString();

  const extractoModelMock: any = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
  };

  // Fake que implementa AiExtractionPort — reemplaza al adapter real (stub o
  // futuro proveedor de IA) para probar ExtractosIaService sin depender de ninguno.
  const fakePort: any = {
    extraerMovimientos: jest.fn(),
  };

  function buildExtractoInstance(overrides: Record<string, unknown> = {}): any {
    const instance: any = {
      nombreArchivo: 'extracto.pdf',
      estado: EstadoExtracto.PROCESANDO,
      movimientos: [],
      mensajeError: undefined,
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
    instance.toObject = jest.fn(() => ({
      nombreArchivo: instance.nombreArchivo,
      estado: instance.estado,
      movimientos: instance.movimientos,
      mensajeError: instance.mensajeError,
    }));
    return instance;
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ExtractosIaService,
        { provide: AI_EXTRACTION_PORT, useValue: fakePort },
        { provide: getModelToken(ExtractoBancario.name), useValue: extractoModelMock },
      ],
    }).compile();

    service = moduleRef.get(ExtractosIaService);
  });

  it('cargarExtracto pasa a "procesado" con los movimientos cuando el puerto responde éxito', async () => {
    const instance = buildExtractoInstance();
    extractoModelMock.create.mockResolvedValue(instance);
    fakePort.extraerMovimientos.mockResolvedValue({
      exitoso: true,
      movimientos: [
        { fecha: '2026-08-01', concepto: 'Transferencia recibida', monto: 1000, tipo: 'credito' },
      ],
      mensaje: 'ok',
    });

    const result = await service.cargarExtracto(
      { nombreArchivo: 'extracto.pdf', contenidoBase64: 'QQ==', clienteId },
      estudioId,
    );

    expect(fakePort.extraerMovimientos).toHaveBeenCalledWith({
      nombreArchivo: 'extracto.pdf',
      contenidoBase64: 'QQ==',
    });
    expect(extractoModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: expect.any(Types.ObjectId),
        nombreArchivo: 'extracto.pdf',
        estado: EstadoExtracto.PROCESANDO,
        estudioId,
      }),
    );
    expect(result.estado).toBe(EstadoExtracto.PROCESADO);
    expect(result.movimientos).toHaveLength(1);
    expect(result.mensajeError).toBeUndefined();
    expect(instance.save).toHaveBeenCalledTimes(1);
  });

  it('cargarExtracto queda en estado "error" con el mensaje cuando el puerto responde no exitoso', async () => {
    const instance = buildExtractoInstance({ nombreArchivo: 'escaneado.pdf' });
    extractoModelMock.create.mockResolvedValue(instance);
    fakePort.extraerMovimientos.mockResolvedValue({
      exitoso: false,
      movimientos: [],
      mensaje: 'PDF sin capa de texto, probablemente escaneado',
    });

    const result = await service.cargarExtracto(
      { nombreArchivo: 'escaneado.pdf', contenidoBase64: '', clienteId },
      estudioId,
    );

    expect(result.estado).toBe(EstadoExtracto.ERROR);
    expect(result.mensajeError).toBe('PDF sin capa de texto, probablemente escaneado');
    expect(result.movimientos).toHaveLength(0);
    expect(instance.save).toHaveBeenCalledTimes(1);
  });

  it('cargarExtracto queda en estado "error" si el puerto lanza una excepción', async () => {
    const instance = buildExtractoInstance();
    extractoModelMock.create.mockResolvedValue(instance);
    fakePort.extraerMovimientos.mockRejectedValue(new Error('timeout del proveedor de IA'));

    const result = await service.cargarExtracto(
      { nombreArchivo: 'extracto.pdf', contenidoBase64: 'QQ==', clienteId },
      estudioId,
    );

    expect(result.estado).toBe(EstadoExtracto.ERROR);
    expect(result.mensajeError).toBe('timeout del proveedor de IA');
    expect(instance.save).toHaveBeenCalledTimes(1);
  });

  it('findAll devuelve el listado paginado filtrado por estudio', async () => {
    const execMock = jest.fn().mockResolvedValue([{ nombreArchivo: 'a.pdf' }]);
    extractoModelMock.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: execMock,
    });
    extractoModelMock.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });

    const result = await service.findAll({ page: 1, limit: 10, sortDir: 'asc' }, estudioId);

    expect(extractoModelMock.find).toHaveBeenCalledWith(expect.objectContaining({ estudioId }));
    expect(result).toEqual({ data: [{ nombreArchivo: 'a.pdf' }], total: 1, page: 1, limit: 10 });
  });

  it('findOne lanza NotFoundException si no existe en el estudio', async () => {
    extractoModelMock.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.findOne('507f1f77bcf86cd799439011', estudioId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('actualizarMovimientos reemplaza los movimientos y recalcula subtotalesPorConcepto', async () => {
    const instance = buildExtractoInstance({
      estado: EstadoExtracto.PROCESADO,
      movimientos: [{ concepto: 'Viejo', monto: 1, fecha: '2026-01-01' }],
    });
    extractoModelMock.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(instance) });

    const nuevosMovimientos = [
      { fecha: '2026-08-01', concepto: 'Transferencia', monto: 1000 },
      { fecha: '2026-08-02', concepto: 'Transferencia', monto: 500 },
      { fecha: '2026-08-03', concepto: 'Comisión mantenimiento', monto: -200 },
    ];

    const result = await service.actualizarMovimientos(
      '507f1f77bcf86cd799439011',
      nuevosMovimientos,
      estudioId,
    );

    expect(instance.movimientos).toEqual(nuevosMovimientos);
    expect(instance.save).toHaveBeenCalledTimes(1);
    expect(result.subtotalesPorConcepto).toEqual({
      Transferencia: 1500,
      'Comisión mantenimiento': -200,
    });
  });
});
