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
  const configValues: Record<string, string | number> = {
    API_PREFIX: 'api/v1',
    FRONTEND_URL: 'http://localhost:5173',
    GOOGLE_OAUTH_CLIENT_ID: 'google-client-id',
    GOOGLE_OAUTH_CLIENT_SECRET: 'google-client-secret',
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_SECRET: 'test-secret',
    PORT: 3000,
  };
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
          useValue: {
            get: (key: string, fallback?: string | number) => configValues[key] ?? fallback,
          },
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

  it('arma la URL de inicio OAuth de Google con callback y returnTo', () => {
    const url = new URL(
      service.buildSocialAuthorizationUrl('google', 'http://localhost:5173/auth/callback'),
    );

    expect(`${url.origin}${url.pathname}`).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('google-client-id');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/api/v1/auth/google/callback',
    );
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('state')).toBeTruthy();
  });
});
