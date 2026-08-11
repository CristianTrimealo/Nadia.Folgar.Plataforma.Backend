import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { Role } from './schemas/role.schema';

describe('RolesService', () => {
  let service: RolesService;
  const roleModelMock = {
    findOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [RolesService, { provide: getModelToken(Role.name), useValue: roleModelMock }],
    }).compile();

    service = moduleRef.get(RolesService);
  });

  it('no permite renombrar un rol de sistema', async () => {
    const save = jest.fn();
    roleModelMock.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ nombre: 'admin', esDeSistema: true, save }),
    });

    await expect(service.update('507f1f77bcf86cd799439011', { nombre: 'otro' })).rejects.toThrow(
      BadRequestException,
    );
    expect(save).not.toHaveBeenCalled();
  });

  it('no permite eliminar un rol de sistema', async () => {
    roleModelMock.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ nombre: 'admin', esDeSistema: true }),
    });

    await expect(service.remove('507f1f77bcf86cd799439011')).rejects.toThrow(BadRequestException);
    expect(roleModelMock.deleteOne).not.toHaveBeenCalled();
  });

  it('siembra los 3 roles de sistema si no existen', async () => {
    roleModelMock.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    roleModelMock.create.mockResolvedValue({});

    await service.onModuleInit();

    expect(roleModelMock.create).toHaveBeenCalledTimes(3);
  });
});
