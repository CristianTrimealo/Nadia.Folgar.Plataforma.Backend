import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';

describe('UsersService', () => {
  let service: UsersService;
  const userModelMock: any = {
    findOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: getModelToken(User.name), useValue: userModelMock }],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('rechaza crear un usuario con email ya existente', async () => {
    userModelMock.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ email: 'ya@existe.com' }),
    });

    await expect(
      service.create(
        { email: 'ya@existe.com', password: 'password123', nombre: 'Test', roleIds: [] },
        new Types.ObjectId(),
      ),
    ).rejects.toThrow(ConflictException);
    expect(userModelMock.create).not.toHaveBeenCalled();
  });

  it('hashea la contraseña antes de crear el usuario', async () => {
    userModelMock.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    userModelMock.create.mockResolvedValue({ email: 'nuevo@folgar.com' });

    await service.create(
      { email: 'Nuevo@Folgar.com', password: 'password123', nombre: 'Test', roleIds: [] },
      new Types.ObjectId(),
    );

    const createArgs = userModelMock.create.mock.calls[0][0];
    expect(createArgs.email).toBe('nuevo@folgar.com');
    expect(createArgs.passwordHash).not.toBe('password123');
    expect(createArgs.passwordHash.length).toBeGreaterThan(20);
  });
});
