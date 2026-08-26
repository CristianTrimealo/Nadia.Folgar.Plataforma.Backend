import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CuentasBancariasService } from './cuentas-bancarias.service';
import { CuentaBancaria, MonedaCuentaBancaria } from './schemas/cuenta-bancaria.schema';
import { ClientesService } from '../clientes/clientes.service';
import { PlanCuentasService } from '../plan-cuentas/plan-cuentas.service';

describe('CuentasBancariasService', () => {
  let service: CuentasBancariasService;
  const estudioId = new Types.ObjectId();
  const clienteId = new Types.ObjectId().toString();
  const cuentaContableId = new Types.ObjectId().toString();

  const cuentaBancariaModelMock: any = {
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
  };
  const clientesServiceMock = { findOne: jest.fn() };
  const planCuentasServiceMock = { findOne: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CuentasBancariasService,
        { provide: getModelToken(CuentaBancaria.name), useValue: cuentaBancariaModelMock },
        { provide: ClientesService, useValue: clientesServiceMock },
        { provide: PlanCuentasService, useValue: planCuentasServiceMock },
      ],
    }).compile();

    service = moduleRef.get(CuentasBancariasService);
  });

  it('crea la cuenta bancaria si la cuenta contable de contrapartida existe en el plan de cuentas del estudio', async () => {
    clientesServiceMock.findOne.mockResolvedValue({ _id: clienteId });
    planCuentasServiceMock.findOne.mockResolvedValue({ _id: cuentaContableId });
    cuentaBancariaModelMock.create.mockResolvedValue({});

    await service.create(
      {
        clienteId,
        banco: 'Banco Santander',
        alias: 'Cuenta Corriente',
        moneda: MonedaCuentaBancaria.ARS,
        cuentaContableId,
      },
      estudioId,
    );

    expect(planCuentasServiceMock.findOne).toHaveBeenCalledWith(cuentaContableId, estudioId);
    expect(cuentaBancariaModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ banco: 'Banco Santander', estudioId }),
    );
  });

  it('rechaza si la cuenta contable no existe en el estudio', async () => {
    clientesServiceMock.findOne.mockResolvedValue({ _id: clienteId });
    planCuentasServiceMock.findOne.mockRejectedValue(new NotFoundException());

    await expect(
      service.create(
        { clienteId, banco: 'Banco Santander', alias: 'Cuenta Corriente', cuentaContableId },
        estudioId,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('findOne lanza NotFoundException si no existe en el estudio', async () => {
    cuentaBancariaModelMock.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.findOne('507f1f77bcf86cd799439011', estudioId)).rejects.toThrow(
      NotFoundException,
    );
  });
});
