import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ClientesService } from './clientes.service';
import { Cliente, RegimenFiscal } from './schemas/cliente.schema';

describe('ClientesService', () => {
  let service: ClientesService;
  const estudioId = new Types.ObjectId();
  const clienteModelMock: any = {
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ClientesService,
        { provide: getModelToken(Cliente.name), useValue: clienteModelMock },
      ],
    }).compile();

    service = moduleRef.get(ClientesService);
  });

  it('normaliza el CUIT (sin guiones) antes de guardar', async () => {
    clienteModelMock.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    clienteModelMock.create.mockResolvedValue({});

    await service.create(
      {
        nombre: 'Cliente Test',
        cuit: '20-12345678-9',
        regimenFiscal: RegimenFiscal.MONOTRIBUTO,
      },
      estudioId,
    );

    expect(clienteModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ cuit: '20123456789' }),
    );
  });

  it('rechaza un CUIT duplicado', async () => {
    clienteModelMock.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ cuit: '20123456789' }),
    });

    await expect(
      service.create(
        {
          nombre: 'Cliente Test',
          cuit: '20-12345678-9',
          regimenFiscal: RegimenFiscal.MONOTRIBUTO,
        },
        estudioId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('findOne lanza NotFoundException si no existe en el estudio', async () => {
    clienteModelMock.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.findOne('507f1f77bcf86cd799439011', estudioId)).rejects.toThrow(
      NotFoundException,
    );
  });
});
