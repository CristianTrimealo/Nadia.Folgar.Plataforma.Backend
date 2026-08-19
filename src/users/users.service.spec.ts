import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';
import * as argon2 from 'argon2';
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

  describe('updateOwnProfile', () => {
    function mockSelf(overrides: Partial<Record<string, unknown>> = {}) {
      const self = {
        _id: new Types.ObjectId(),
        email: 'yo@folgar.com',
        nombre: 'Yo',
        save: jest.fn().mockResolvedValue(undefined),
        ...overrides,
      };
      userModelMock.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(self) }),
      });
      return self;
    }

    it('rechaza cambiar el email a uno ya usado por otro usuario', async () => {
      const self = mockSelf();
      userModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ email: 'tomado@folgar.com' }),
      });

      await expect(
        service.updateOwnProfile(self._id.toString(), { email: 'tomado@folgar.com' }),
      ).rejects.toThrow(ConflictException);
      expect(self.save).not.toHaveBeenCalled();
    });

    it('actualiza nombre y datos de contacto', async () => {
      const self = mockSelf();

      const updated = await service.updateOwnProfile(self._id.toString(), {
        nombre: 'Nuevo Nombre',
        telefono: '+54 9 291 123-4567',
        pais: 'Argentina',
      });

      expect(updated.nombre).toBe('Nuevo Nombre');
      expect(updated.telefono).toBe('+54 9 291 123-4567');
      expect(updated.pais).toBe('Argentina');
      expect(self.save).toHaveBeenCalled();
    });
  });

  describe('changeOwnPassword', () => {
    it('rechaza si la contraseña actual no coincide', async () => {
      const passwordHash = await argon2.hash('correcta123');
      const self = {
        _id: new Types.ObjectId(),
        passwordHash,
        save: jest.fn(),
      };
      userModelMock.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(self) }),
      });

      await expect(
        service.changeOwnPassword(self._id.toString(), {
          currentPassword: 'incorrecta',
          newPassword: 'nuevaClave123',
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(self.save).not.toHaveBeenCalled();
    });

    it('hashea y guarda la nueva contraseña cuando la actual es correcta', async () => {
      const passwordHash = await argon2.hash('correcta123');
      const self = {
        _id: new Types.ObjectId(),
        passwordHash,
        save: jest.fn().mockResolvedValue(undefined),
      };
      userModelMock.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(self) }),
      });

      await service.changeOwnPassword(self._id.toString(), {
        currentPassword: 'correcta123',
        newPassword: 'nuevaClave123',
      });

      expect(self.save).toHaveBeenCalled();
      expect(self.passwordHash).not.toBe(passwordHash);
      await expect(argon2.verify(self.passwordHash, 'nuevaClave123')).resolves.toBe(true);
    });
  });

  describe('toProfileResponse', () => {
    it('arma el data URL del avatar cuando hay foto cargada', () => {
      const profile = service.toProfileResponse({
        _id: new Types.ObjectId(),
        email: 'yo@folgar.com',
        nombre: 'Yo',
        avatarContentType: 'image/png',
        avatarBase64: 'AAAA',
      } as any);

      expect(profile.avatarDataUrl).toBe('data:image/png;base64,AAAA');
    });

    it('devuelve avatarDataUrl null cuando no hay foto cargada', () => {
      const profile = service.toProfileResponse({
        _id: new Types.ObjectId(),
        email: 'yo@folgar.com',
        nombre: 'Yo',
      } as any);

      expect(profile.avatarDataUrl).toBeNull();
    });
  });
});
