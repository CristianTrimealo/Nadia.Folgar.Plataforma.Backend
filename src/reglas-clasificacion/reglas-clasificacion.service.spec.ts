import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ReglasClasificacionService } from './reglas-clasificacion.service';
import {
  LadoAsiento,
  ProcedenciaRegla,
  ReglaClasificacion,
} from './schemas/regla-clasificacion.schema';
import { ClientesService } from '../clientes/clientes.service';
import { PlanCuentasService } from '../plan-cuentas/plan-cuentas.service';
import { CuentasBancariasService } from '../cuentas-bancarias/cuentas-bancarias.service';

describe('ReglasClasificacionService', () => {
  let service: ReglasClasificacionService;
  const estudioId = new Types.ObjectId();
  const creadoPor = new Types.ObjectId();
  const clienteId = new Types.ObjectId().toString();
  const cuentaContableId = new Types.ObjectId().toString();

  const reglaModelMock: any = {
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
  };
  const clientesServiceMock = { findOne: jest.fn() };
  const planCuentasServiceMock = { findOne: jest.fn() };
  const cuentasBancariasServiceMock = { findOne: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ReglasClasificacionService,
        { provide: getModelToken(ReglaClasificacion.name), useValue: reglaModelMock },
        { provide: ClientesService, useValue: clientesServiceMock },
        { provide: PlanCuentasService, useValue: planCuentasServiceMock },
        { provide: CuentasBancariasService, useValue: cuentasBancariasServiceMock },
      ],
    }).compile();

    service = moduleRef.get(ReglasClasificacionService);
  });

  it('crea una regla manual (sin origenMovimientoId) con procedencia "manual"', async () => {
    clientesServiceMock.findOne.mockResolvedValue({ _id: clienteId });
    planCuentasServiceMock.findOne.mockResolvedValue({ _id: cuentaContableId });
    reglaModelMock.create.mockResolvedValue({});

    await service.create(
      {
        clienteId,
        conceptoContable: 'Cobros con Tarjetas',
        cuentaContableId,
        ladoAsiento: LadoAsiento.HABER,
        patronTexto: 'pago comercios',
      },
      estudioId,
      creadoPor,
    );

    expect(reglaModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ procedencia: ProcedenciaRegla.MANUAL, creadoPor, estudioId }),
    );
  });

  it('deriva procedencia "aprendida" cuando viene origenMovimientoId', async () => {
    clientesServiceMock.findOne.mockResolvedValue({ _id: clienteId });
    planCuentasServiceMock.findOne.mockResolvedValue({ _id: cuentaContableId });
    reglaModelMock.create.mockResolvedValue({});
    const origenMovimientoId = new Types.ObjectId().toString();

    await service.create(
      {
        clienteId,
        conceptoContable: 'SUSS a pagar',
        cuentaContableId,
        ladoAsiento: LadoAsiento.DEBE,
        origenMovimientoId,
      },
      estudioId,
      creadoPor,
    );

    expect(reglaModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ procedencia: ProcedenciaRegla.APRENDIDA }),
    );
  });

  it('rechaza si la cuenta contable no existe en el estudio', async () => {
    clientesServiceMock.findOne.mockResolvedValue({ _id: clienteId });
    planCuentasServiceMock.findOne.mockRejectedValue(new NotFoundException());

    await expect(
      service.create(
        {
          clienteId,
          conceptoContable: 'Cobros con Tarjetas',
          cuentaContableId,
          ladoAsiento: LadoAsiento.HABER,
        },
        estudioId,
        creadoPor,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('rechaza si la cuenta bancaria pertenece a otro cliente', async () => {
    clientesServiceMock.findOne.mockResolvedValue({ _id: clienteId });
    planCuentasServiceMock.findOne.mockResolvedValue({ _id: cuentaContableId });
    const cuentaBancariaId = new Types.ObjectId().toString();
    cuentasBancariasServiceMock.findOne.mockResolvedValue({
      clienteId: { toString: () => new Types.ObjectId().toString() },
    });

    await expect(
      service.create(
        {
          clienteId,
          cuentaBancariaId,
          conceptoContable: 'Cobros con Tarjetas',
          cuentaContableId,
          ladoAsiento: LadoAsiento.HABER,
        },
        estudioId,
        creadoPor,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('findOne lanza NotFoundException si no existe en el estudio', async () => {
    reglaModelMock.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.findOne('507f1f77bcf86cd799439011', estudioId)).rejects.toThrow(
      NotFoundException,
    );
  });

  describe('crearSugeridaPorIa', () => {
    it('crea la regla con procedencia IA, prioridad alta y activa, sin revalidar cliente/cuenta', async () => {
      reglaModelMock.create.mockResolvedValue({});
      const cuentaBancariaId = new Types.ObjectId().toString();

      await service.crearSugeridaPorIa(
        {
          clienteId,
          cuentaBancariaId,
          conceptoContable: 'Comisión mantenimiento',
          cuentaContableId,
          ladoAsiento: LadoAsiento.DEBE,
          patronTexto: 'Comisión mantenimiento',
          tipoMovimiento: 'debito',
        },
        estudioId,
        creadoPor,
      );

      expect(reglaModelMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clienteId,
          cuentaBancariaId,
          cuentaContableId,
          procedencia: ProcedenciaRegla.IA,
          prioridad: 500,
          activa: true,
          creadoPor,
          estudioId,
        }),
      );
      expect(clientesServiceMock.findOne).not.toHaveBeenCalled();
      expect(planCuentasServiceMock.findOne).not.toHaveBeenCalled();
    });
  });
});
