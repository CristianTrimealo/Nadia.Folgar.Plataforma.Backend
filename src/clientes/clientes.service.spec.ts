import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ClientesService } from './clientes.service';
import { Cliente, RegimenFiscal } from './schemas/cliente.schema';
import { User } from '../users/schemas/user.schema';
import { IntegracionIa } from '../configuracion/schemas/integracion-ia.schema';
import { ProveedorIA } from '../common/enums/proveedor-ia.enum';

describe('ClientesService', () => {
  let service: ClientesService;
  const estudioId = new Types.ObjectId();
  const clienteModelMock: any = {
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
  };
  // Sin titulares en la mayoría de los tests (`find` de userModel resuelve
  // `[]`) para que `responsablesEfectivos` no interfiera con las
  // aserciones sobre `responsableIds` — se prueba aparte más abajo.
  const userModelMock: any = {
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    }),
  };
  const integracionIaModelMock: any = { exists: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    userModelMock.find.mockReturnValue({
      select: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    });
    integracionIaModelMock.exists.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    const moduleRef = await Test.createTestingModule({
      providers: [
        ClientesService,
        { provide: getModelToken(Cliente.name), useValue: clienteModelMock },
        { provide: getModelToken(User.name), useValue: userModelMock },
        { provide: getModelToken(IntegracionIa.name), useValue: integracionIaModelMock },
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
    clienteModelMock.findOne.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(service.findOne('507f1f77bcf86cd799439011', estudioId)).rejects.toThrow(
      NotFoundException,
    );
  });

  describe('responsableIds (asignación a "Personal", ahora múltiple)', () => {
    interface MockCliente {
      _id: Types.ObjectId;
      cuit: string;
      responsableIds?: Types.ObjectId[];
      save: jest.Mock;
      populate: jest.Mock;
      toObject: jest.Mock;
    }

    function mockCliente(overrides: Partial<MockCliente> = {}): MockCliente {
      const cliente: MockCliente = {
        _id: new Types.ObjectId(),
        cuit: '20123456789',
        responsableIds: [],
        save: jest.fn().mockResolvedValue(undefined),
        populate: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn(),
        ...overrides,
      };
      cliente.toObject.mockImplementation(() => ({ ...cliente }));
      clienteModelMock.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(cliente),
      });
      return cliente;
    }

    it('asigna responsableIds al crear', async () => {
      clienteModelMock.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      clienteModelMock.create.mockResolvedValue({});
      const responsableIds = [new Types.ObjectId().toString()];

      await service.create(
        {
          nombre: 'Cliente Test',
          cuit: '20-12345678-9',
          regimenFiscal: RegimenFiscal.MONOTRIBUTO,
          responsableIds,
        },
        estudioId,
      );

      expect(clienteModelMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ responsableIds }),
      );
    });

    it('vacía la asignación cuando se manda responsableIds: []', async () => {
      const responsableIds = [new Types.ObjectId()];
      const cliente = mockCliente({ responsableIds });

      await service.update(cliente._id.toString(), { responsableIds: [] }, estudioId);

      expect(cliente.responsableIds).toEqual([]);
      expect(cliente.save).toHaveBeenCalled();
    });

    it('no toca la asignación si responsableIds viene ausente (undefined)', async () => {
      const responsableIds = [new Types.ObjectId()];
      const cliente = mockCliente({ responsableIds });

      await service.update(cliente._id.toString(), { nombre: 'Nuevo nombre' }, estudioId);

      expect(cliente.responsableIds).toBe(responsableIds);
    });

    it('reemplaza la asignación completa con los IDs mandados (agregar sin perder a los demás lo arma el Frontend)', async () => {
      const cliente = mockCliente();
      const nuevoId = new Types.ObjectId().toString();
      const yaExistiaId = new Types.ObjectId().toString();

      await service.update(
        cliente._id.toString(),
        { responsableIds: [yaExistiaId, nuevoId] },
        estudioId,
      );

      expect(cliente.responsableIds?.map((id) => id.toString())).toEqual([yaExistiaId, nuevoId]);
    });
  });

  describe('responsablesEfectivos (esTitular automático)', () => {
    it('suma a quien tenga esTitular aunque no esté en responsableIds', async () => {
      const titularId = new Types.ObjectId();
      userModelMock.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest
            .fn()
            .mockResolvedValue([{ _id: titularId, nombre: 'Nadia Folgar', email: undefined }]),
        }),
      });

      const cliente = {
        toObject: () => ({ _id: new Types.ObjectId(), responsableIds: [] }),
      };
      clienteModelMock.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(cliente),
      });

      const result = (await service.findOne('507f1f77bcf86cd799439011', estudioId)) as {
        responsablesEfectivos: Array<{ nombre: string }>;
      };

      expect(result.responsablesEfectivos).toEqual([
        { _id: titularId, nombre: 'Nadia Folgar', email: undefined },
      ]);
      // No filtra por rol — pide directamente `esTitular: true`, no
      // "cualquier admin" (hay una cuenta de admin de pruebas que no debe
      // figurar acá, ver `user.schema.ts`).
      expect(userModelMock.find).toHaveBeenCalledWith(expect.objectContaining({ esTitular: true }));
    });

    it('NO se mezcla con "Personal a cargo" (responsableIds) — son dos cosas separadas', async () => {
      const titularId = new Types.ObjectId();
      const daianaId = new Types.ObjectId();
      userModelMock.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([{ _id: titularId, nombre: 'Nadia Folgar' }]),
        }),
      });

      // El cliente tiene a Daiana como "Personal a cargo" (responsableIds)
      // — pedido explícito del usuario: eso NO debe aparecer en
      // `responsablesEfectivos`, que es solo el/la titular.
      const cliente = {
        toObject: () => ({
          _id: new Types.ObjectId(),
          responsableIds: [{ _id: daianaId, nombre: 'Daiana Gencarelli' }],
        }),
      };
      clienteModelMock.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(cliente),
      });

      const result = (await service.findOne('507f1f77bcf86cd799439011', estudioId)) as {
        responsablesEfectivos: Array<{ nombre: string }>;
      };

      expect(result.responsablesEfectivos).toEqual([{ _id: titularId, nombre: 'Nadia Folgar' }]);
    });
  });

  describe('motorIaPreferido', () => {
    it('rechaza setear un motor que el estudio no tiene conectado', async () => {
      clienteModelMock.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      integracionIaModelMock.exists.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(
        service.create(
          {
            nombre: 'Cliente Test',
            cuit: '20-12345678-9',
            regimenFiscal: RegimenFiscal.MONOTRIBUTO,
            motorIaPreferido: ProveedorIA.OPENAI,
          },
          estudioId,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(clienteModelMock.create).not.toHaveBeenCalled();
    });

    it('permite setear un motor que el estudio si tiene conectado', async () => {
      clienteModelMock.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      clienteModelMock.create.mockResolvedValue({});
      integracionIaModelMock.exists.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      });

      await service.create(
        {
          nombre: 'Cliente Test',
          cuit: '20-12345678-9',
          regimenFiscal: RegimenFiscal.MONOTRIBUTO,
          motorIaPreferido: ProveedorIA.OPENAI,
        },
        estudioId,
      );

      expect(integracionIaModelMock.exists).toHaveBeenCalledWith({
        estudioId,
        proveedor: ProveedorIA.OPENAI,
      });
      expect(clienteModelMock.create).toHaveBeenCalled();
    });
  });
});
