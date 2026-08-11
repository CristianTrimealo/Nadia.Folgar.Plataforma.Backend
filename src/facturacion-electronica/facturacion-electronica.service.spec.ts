import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { FacturacionElectronicaService } from './facturacion-electronica.service';
import { Factura, EstadoFactura } from './schemas/factura.schema';
import { Cliente } from '../clientes/schemas/cliente.schema';
import { FACTURACION_ELECTRONICA_PORT } from './ports/facturacion-electronica.port';

describe('FacturacionElectronicaService', () => {
  let service: FacturacionElectronicaService;
  const estudioId = new Types.ObjectId();
  const clienteId = new Types.ObjectId();
  const userId = new Types.ObjectId();

  const facturaModelMock: any = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
  };
  const clienteModelMock: any = { findOne: jest.fn() };
  const portMock = { emitirComprobante: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        FacturacionElectronicaService,
        { provide: getModelToken(Factura.name), useValue: facturaModelMock },
        { provide: getModelToken(Cliente.name), useValue: clienteModelMock },
        { provide: FACTURACION_ELECTRONICA_PORT, useValue: portMock },
      ],
    }).compile();

    service = moduleRef.get(FacturacionElectronicaService);
  });

  it('rechaza aprobar si el cliente tiene facturas impagas sin forzar la excepción', async () => {
    const save = jest.fn();
    facturaModelMock.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: 'f1',
        clienteId,
        estado: EstadoFactura.PREFACTURA,
        save,
      }),
    });
    facturaModelMock.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([{ monto: 1000 }]),
    });

    await expect(service.aprobar('f1', {}, userId, estudioId)).rejects.toThrow(BadRequestException);
    expect(save).not.toHaveBeenCalled();
  });

  it('aprueba con excepción si forzarPeseADeuda viene con justificación', async () => {
    const facturaDoc: any = {
      _id: 'f1',
      clienteId,
      estado: EstadoFactura.PREFACTURA,
      save: jest.fn(),
    };
    facturaModelMock.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(facturaDoc) });
    facturaModelMock.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([{ monto: 1000 }]),
    });

    await service.aprobar(
      'f1',
      {
        forzarPeseADeuda: true,
        justificacionExcepcion: 'Cliente lo pagó en efectivo, falta cargar',
      },
      userId,
      estudioId,
    );

    expect(facturaDoc.estado).toBe(EstadoFactura.APROBADA);
    expect(facturaDoc.excepcionBloqueoPorImpagos).toBe(true);
    expect(facturaDoc.save).toHaveBeenCalled();
  });

  it('emitir falla si la factura no está aprobada', async () => {
    facturaModelMock.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ estado: EstadoFactura.PREFACTURA }),
    });

    await expect(service.emitir('f1', estudioId)).rejects.toThrow(BadRequestException);
    expect(portMock.emitirComprobante).not.toHaveBeenCalled();
  });

  it('emitir llama al puerto y persiste CAE/numeroComprobante cuando está aprobada', async () => {
    const facturaDoc: any = {
      estado: EstadoFactura.APROBADA,
      clienteId,
      concepto: 'Honorarios',
      monto: 5000,
      save: jest.fn(),
    };
    facturaModelMock.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(facturaDoc) });
    clienteModelMock.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ nombre: 'Cliente Test', cuit: '20123456789' }),
    });
    portMock.emitirComprobante.mockResolvedValue({
      exitoso: true,
      cae: 'CAE123',
      numeroComprobante: '0001-00000001',
    });

    await service.emitir('f1', estudioId);

    expect(facturaDoc.estado).toBe(EstadoFactura.EMITIDA);
    expect(facturaDoc.cae).toBe('CAE123');
    expect(facturaDoc.save).toHaveBeenCalled();
  });
});
