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
    userModelMock.create.mockResolvedValue({
      email: 'nuevo@folgar.com',
      populate: jest.fn().mockResolvedValue(undefined),
    });

    await service.create(
      { email: 'Nuevo@Folgar.com', password: 'password123', nombre: 'Test', roleIds: [] },
      new Types.ObjectId(),
    );

    const createArgs = userModelMock.create.mock.calls[0][0];
    expect(createArgs.email).toBe('nuevo@folgar.com');
    expect(createArgs.passwordHash).not.toBe('password123');
    expect(createArgs.passwordHash.length).toBeGreaterThan(20);
  });

  it('persiste teléfono y régimen fiscal ("contacto" de Personal) al crear', async () => {
    userModelMock.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    userModelMock.create.mockResolvedValue({
      email: 'nueva@folgar.com',
      populate: jest.fn().mockResolvedValue(undefined),
    });

    await service.create(
      {
        email: 'nueva@folgar.com',
        password: 'password123',
        nombre: 'Nueva Contadora',
        roleIds: [],
        telefono: '+54 9 291 555-1234',
        regimenFiscal: 'monotributo' as any,
      },
      new Types.ObjectId(),
    );

    const createArgs = userModelMock.create.mock.calls[0][0];
    expect(createArgs.telefono).toBe('+54 9 291 555-1234');
    expect(createArgs.regimenFiscal).toBe('monotributo');
  });

  it('permite crear un usuario sin email (pedido explícito: "Personal" sin email todavía) sin chequear duplicados', async () => {
    userModelMock.create.mockResolvedValue({
      email: undefined,
      populate: jest.fn().mockResolvedValue(undefined),
    });

    await service.create(
      { password: 'password123', nombre: 'Nadia Folgar', roleIds: [] },
      new Types.ObjectId(),
    );

    // Sin email no hay nada que chequear por duplicado — ni siquiera se
    // llama a `findOne` (el índice único de Mongo es `sparse`, así que
    // varios usuarios sin email conviven sin chocar, ver `user.schema.ts`).
    expect(userModelMock.findOne).not.toHaveBeenCalled();
    const createArgs = userModelMock.create.mock.calls[0][0];
    expect(createArgs.email).toBeUndefined();
  });

  describe('update', () => {
    interface MockUser {
      _id: Types.ObjectId;
      email?: string;
      nombre: string;
      save: jest.Mock;
    }

    function mockUser(overrides: Partial<MockUser> = {}): MockUser {
      const user: MockUser = {
        _id: new Types.ObjectId(),
        email: undefined,
        nombre: 'Nadia Folgar',
        save: jest.fn().mockResolvedValue(undefined),
        ...overrides,
      };
      userModelMock.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(user) }),
      });
      return user;
    }

    it('permite completarle el email a un usuario que no tenía (caso "Personal" sin email)', async () => {
      const user = mockUser();
      userModelMock.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const updated = await service.update(user._id.toString(), {
        email: 'Nadia@Folgar.com',
      });

      expect(updated.email).toBe('nadia@folgar.com');
      expect(user.save).toHaveBeenCalled();
    });

    it('rechaza el email nuevo si ya lo tiene otro usuario (antes esta ruta no lo chequeaba)', async () => {
      const user = mockUser();
      userModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ email: 'tomado@folgar.com' }),
      });

      await expect(
        service.update(user._id.toString(), { email: 'tomado@folgar.com' } as any),
      ).rejects.toThrow(ConflictException);
      expect(user.save).not.toHaveBeenCalled();
    });

    it('no toca el email si no viene en el body — undefined sigue significando "no tocar"', async () => {
      const user = mockUser({ email: 'ya@tengo.com' });

      await service.update(user._id.toString(), { nombre: 'Nuevo Nombre' });

      expect(user.email).toBe('ya@tengo.com');
      expect(user.nombre).toBe('Nuevo Nombre');
      expect(userModelMock.findOne).not.toHaveBeenCalled();
    });
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
        genero: 'femenino',
      });

      expect(updated.nombre).toBe('Nuevo Nombre');
      expect(updated.telefono).toBe('+54 9 291 123-4567');
      expect(updated.pais).toBe('Argentina');
      expect(updated.genero).toBe('femenino');
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
        genero: 'femenino',
      } as any);

      expect(profile.avatarDataUrl).toBeNull();
      expect(profile.genero).toBe('femenino');
    });
  });

  describe('toSummary', () => {
    it('nunca incluye passwordHash, y mapea los roles poblados por nombre', () => {
      const roleId = new Types.ObjectId();
      const summary = service.toSummary({
        _id: new Types.ObjectId(),
        email: 'contadora@folgar.com',
        nombre: 'Una Contadora',
        passwordHash: 'hash-secreto-no-debería-salir',
        telefono: '+54 9 291 555-1234',
        regimenFiscal: 'monotributo',
        roleIds: [{ _id: roleId, nombre: 'contador' }],
        activo: true,
      } as any);

      expect(summary).not.toHaveProperty('passwordHash');
      expect(summary.roles).toEqual([{ _id: roleId.toString(), nombre: 'contador' }]);
      expect(summary.telefono).toBe('+54 9 291 555-1234');
      expect(summary.regimenFiscal).toBe('monotributo');
    });

    it('no revienta si roleIds no vino poblado (queda con nombre vacío)', () => {
      const roleId = new Types.ObjectId();
      const summary = service.toSummary({
        _id: new Types.ObjectId(),
        email: 'sin-poblar@folgar.com',
        nombre: 'Sin Poblar',
        roleIds: [roleId],
        activo: true,
      } as any);

      expect(summary.roles).toEqual([{ _id: roleId.toString(), nombre: '' }]);
    });
  });
});
