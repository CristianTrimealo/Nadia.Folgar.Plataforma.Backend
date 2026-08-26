import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { IntegracionesService } from './integraciones.service';
import { IntegracionIa } from './schemas/integracion-ia.schema';
import { Estudio } from '../tenancy/schemas/estudio.schema';
import { ProveedorIA } from '../common/enums/proveedor-ia.enum';
import { SecretCipherService } from '../common/crypto/secret-cipher.service';
import { ProveedorIaValidatorService } from './proveedor-ia-validator.service';

describe('IntegracionesService', () => {
  let service: IntegracionesService;
  const estudioId = new Types.ObjectId();
  const userId = new Types.ObjectId();

  const integracionModelMock: any = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
  };
  const estudioModelMock: any = { findByIdAndUpdate: jest.fn(), findById: jest.fn() };
  const secretCipherMock = { encrypt: jest.fn(), decrypt: jest.fn() };
  const validatorMock = { validar: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        IntegracionesService,
        { provide: getModelToken(IntegracionIa.name), useValue: integracionModelMock },
        { provide: getModelToken(Estudio.name), useValue: estudioModelMock },
        { provide: SecretCipherService, useValue: secretCipherMock },
        { provide: ProveedorIaValidatorService, useValue: validatorMock },
      ],
    }).compile();

    service = moduleRef.get(IntegracionesService);
  });

  describe('listar', () => {
    it('devuelve las integraciones enmascaradas junto con el motor por defecto del estudio', async () => {
      integracionModelMock.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            proveedor: ProveedorIA.OPENAI,
            apiKeyPreview: '····ABCD',
            modelo: 'gpt-5.1',
            conectadoPor: userId,
            updatedAt: new Date('2026-08-01'),
          },
        ]),
      });
      estudioModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ motorIaPorDefecto: ProveedorIA.OPENAI }),
      });

      const resultado = await service.listar(estudioId);

      expect(resultado.motorIaPorDefecto).toBe(ProveedorIA.OPENAI);
      expect(resultado.integraciones).toHaveLength(1);
      expect(resultado.integraciones[0].apiKeyPreview).toBe('····ABCD');
    });

    it('devuelve motorIaPorDefecto undefined si el estudio todavía no eligió ninguno', async () => {
      integracionModelMock.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
      estudioModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ motorIaPorDefecto: undefined }),
      });

      const resultado = await service.listar(estudioId);

      expect(resultado.motorIaPorDefecto).toBeUndefined();
      expect(resultado.integraciones).toEqual([]);
    });
  });

  describe('conectar', () => {
    it('valida contra el proveedor real antes de cifrar y guardar', async () => {
      secretCipherMock.encrypt.mockReturnValue('cifrado-xyz');
      integracionModelMock.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          proveedor: ProveedorIA.OPENAI,
          apiKeyPreview: '····ABCD',
          modelo: 'gpt-5.1',
          conectadoPor: userId,
          updatedAt: new Date('2026-08-01'),
        }),
      });

      const resultado = await service.conectar(estudioId, userId, {
        proveedor: ProveedorIA.OPENAI,
        apiKey: 'sk-proj-1234567890ABCD',
        modelo: 'gpt-5.1',
      });

      expect(validatorMock.validar).toHaveBeenCalledWith(
        ProveedorIA.OPENAI,
        'sk-proj-1234567890ABCD',
      );
      expect(secretCipherMock.encrypt).toHaveBeenCalledWith('sk-proj-1234567890ABCD');
      expect(integracionModelMock.findOneAndUpdate).toHaveBeenCalledWith(
        { estudioId, proveedor: ProveedorIA.OPENAI },
        expect.objectContaining({ apiKeyCifrada: 'cifrado-xyz', apiKeyPreview: '····ABCD' }),
        { upsert: true, new: true },
      );
      expect(resultado.apiKeyPreview).toBe('····ABCD');
      expect((resultado as any).apiKeyCifrada).toBeUndefined();
    });

    it('no guarda nada si la validación contra el proveedor falla', async () => {
      validatorMock.validar.mockRejectedValue(new BadRequestException('key inválida'));

      await expect(
        service.conectar(estudioId, userId, {
          proveedor: ProveedorIA.ANTHROPIC,
          apiKey: 'sk-ant-mala',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(integracionModelMock.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('setMotorPorDefecto', () => {
    it('rechaza si el proveedor no tiene una integración conectada', async () => {
      integracionModelMock.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.setMotorPorDefecto(estudioId, ProveedorIA.OPENAI)).rejects.toThrow(
        BadRequestException,
      );
      expect(estudioModelMock.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('actualiza el motor por defecto del estudio si el proveedor está conectado', async () => {
      integracionModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ proveedor: ProveedorIA.ANTHROPIC }),
      });
      estudioModelMock.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ motorIaPorDefecto: ProveedorIA.ANTHROPIC }),
      });

      await service.setMotorPorDefecto(estudioId, ProveedorIA.ANTHROPIC);

      expect(estudioModelMock.findByIdAndUpdate).toHaveBeenCalledWith(
        estudioId,
        { motorIaPorDefecto: ProveedorIA.ANTHROPIC },
        { new: true },
      );
    });
  });

  describe('obtenerCredencialDescifrada', () => {
    it('devuelve null si no hay integración conectada para ese proveedor', async () => {
      integracionModelMock.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const resultado = await service.obtenerCredencialDescifrada(estudioId, ProveedorIA.OPENAI);

      expect(resultado).toBeNull();
      expect(secretCipherMock.decrypt).not.toHaveBeenCalled();
    });

    it('descifra la key guardada cuando hay integración conectada', async () => {
      integracionModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ apiKeyCifrada: 'cifrado-xyz', modelo: 'gpt-5.1' }),
      });
      secretCipherMock.decrypt.mockReturnValue('sk-proj-real');

      const resultado = await service.obtenerCredencialDescifrada(estudioId, ProveedorIA.OPENAI);

      expect(secretCipherMock.decrypt).toHaveBeenCalledWith('cifrado-xyz');
      expect(resultado).toEqual({ apiKey: 'sk-proj-real', modelo: 'gpt-5.1' });
    });
  });
});
