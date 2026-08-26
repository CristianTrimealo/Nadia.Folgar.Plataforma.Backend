import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PlanCuentasService } from './plan-cuentas.service';
import { CuentaContable, NaturalezaCuenta } from './schemas/cuenta-contable.schema';

describe('PlanCuentasService', () => {
  let service: PlanCuentasService;
  const estudioId = new Types.ObjectId();

  const cuentaContableModelMock: any = {
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        PlanCuentasService,
        { provide: getModelToken(CuentaContable.name), useValue: cuentaContableModelMock },
      ],
    }).compile();

    service = moduleRef.get(PlanCuentasService);
  });

  it('crea una cuenta contable si el código está disponible en el estudio', async () => {
    cuentaContableModelMock.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    cuentaContableModelMock.create.mockResolvedValue({});

    await service.create(
      { codigo: '519', nombre: 'Gastos Bancarios', naturaleza: NaturalezaCuenta.DEUDORA },
      estudioId,
    );

    expect(cuentaContableModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ codigo: '519', estudioId }),
    );
  });

  it('rechaza un código duplicado en el mismo estudio', async () => {
    cuentaContableModelMock.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ codigo: '519' }),
    });

    await expect(
      service.create(
        { codigo: '519', nombre: 'Gastos Bancarios', naturaleza: NaturalezaCuenta.DEUDORA },
        estudioId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('findOne lanza NotFoundException si no existe en el estudio', async () => {
    cuentaContableModelMock.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.findOne('507f1f77bcf86cd799439011', estudioId)).rejects.toThrow(
      NotFoundException,
    );
  });
});
