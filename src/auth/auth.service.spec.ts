import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  const usersServiceMock = {
    findByEmail: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersServiceMock },
        JwtService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => (key === 'JWT_EXPIRES_IN' ? '15m' : 'test-secret') },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('rechaza credenciales con password incorrecto', async () => {
    const passwordHash = await argon2.hash('correcta123');
    usersServiceMock.findByEmail.mockResolvedValue({ activo: true, passwordHash });

    await expect(service.validateUser('a@b.com', 'incorrecta')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza usuarios inactivos aunque la password sea correcta', async () => {
    const passwordHash = await argon2.hash('correcta123');
    usersServiceMock.findByEmail.mockResolvedValue({ activo: false, passwordHash });

    await expect(service.validateUser('a@b.com', 'correcta123')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('buildUserContext calcula permisos como unión de los roles del usuario', () => {
    const user = {
      _id: new Types.ObjectId(),
      email: 'a@b.com',
      estudioId: new Types.ObjectId(),
      clienteId: undefined,
      roleIds: [
        { nombre: 'contador', permisos: ['clientes.read', 'clientes.write'] },
        { nombre: 'admin', permisos: ['clientes.write', 'users.read'] },
      ],
    } as any;

    const context = service.buildUserContext(user);

    expect(context.roles).toEqual(['contador', 'admin']);
    expect(context.permissions.sort()).toEqual(
      ['clientes.read', 'clientes.write', 'users.read'].sort(),
    );
  });
});
