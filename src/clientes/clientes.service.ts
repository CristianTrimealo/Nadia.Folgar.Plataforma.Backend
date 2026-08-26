import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Cliente, ClienteDocument } from './schemas/cliente.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  IntegracionIa,
  IntegracionIaDocument,
} from '../configuracion/schemas/integracion-ia.schema';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { QueryClienteDto } from './dto/query-cliente.dto';
import { PaginatedResult } from '../common/dto/pagination-query.dto';

function normalizeCuit(cuit: string): string {
  return cuit.replace(/-/g, '');
}

interface PersonalRef {
  _id: Types.ObjectId;
  nombre: string;
  email?: string;
}

@Injectable()
export class ClientesService {
  constructor(
    @InjectModel(Cliente.name) private readonly clienteModel: Model<ClienteDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(IntegracionIa.name)
    private readonly integracionIaModel: Model<IntegracionIaDocument>,
  ) {}

  /**
   * Usuarios marcados como `esTitular` (dueño/a real del estudio, hoy solo
   * Nadia Folgar) — van en `responsablesEfectivos` de TODOS los clientes.
   * A propósito NO es "cualquier usuario con rol admin": el estudio tiene
   * una cuenta de admin de desarrollo ("Yami") que el usuario pidió
   * explícitamente que no aparezca acá — ver el comentario en
   * `user.schema.ts`. Es una regla calculada, no un dato grabado en el
   * cliente — así no hace falta re-migrar nada si cambia quién es titular.
   */
  private async findResponsablesAutomaticos(estudioId: Types.ObjectId): Promise<PersonalRef[]> {
    const titulares = await this.userModel
      .find({ estudioId, esTitular: true, activo: true })
      .select('nombre email')
      .exec();
    return titulares.map((titular) => ({
      _id: titular._id,
      nombre: titular.nombre,
      email: titular.email,
    }));
  }

  /**
   * `responsablesEfectivos` = SOLO el/la titular (hoy Nadia Folgar) — a
   * propósito no se mezcla con `responsableIds` ("Personal a cargo", quien
   * de verdad trabaja ese cliente): son dos conceptos separados, pedido
   * explícito del usuario ("en responsable solo debe estar Nadia Folgar,
   * personal a cargo es otra cosa"). Antes esta función unía ambos arrays
   * (con dedup) — se sacó esa unión, no solo el dedup.
   */
  private async attachResponsablesEfectivos(
    clientes: ClienteDocument[],
    estudioId: Types.ObjectId,
  ): Promise<Record<string, unknown>[]> {
    const automaticos = await this.findResponsablesAutomaticos(estudioId);
    return clientes.map((cliente) => {
      const obj = cliente.toObject() as unknown as Record<string, unknown>;
      obj.responsablesEfectivos = automaticos;
      return obj;
    });
  }

  /** `motorIaPreferido` solo puede setearse a un proveedor que el estudio ya conectó en Configuración → Integraciones. */
  private async validarMotorIaPreferido(
    dto: CreateClienteDto | UpdateClienteDto,
    estudioId: Types.ObjectId,
  ): Promise<void> {
    if (!dto.motorIaPreferido) return;

    const conectada = await this.integracionIaModel
      .exists({ estudioId, proveedor: dto.motorIaPreferido })
      .exec();
    if (!conectada) {
      throw new BadRequestException(
        `El estudio no tiene conectado "${dto.motorIaPreferido}" en Configuración → Integraciones.`,
      );
    }
  }

  async findAll(
    query: QueryClienteDto,
    estudioId: Types.ObjectId,
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const filter: FilterQuery<ClienteDocument> = { estudioId };

    if (query.regimenFiscal) {
      filter.regimenFiscal = query.regimenFiscal;
    }

    if (query.search) {
      filter.$or = [
        { nombre: { $regex: query.search, $options: 'i' } },
        { cuit: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
      ];
    }

    const sort: Record<string, 1 | -1> = query.sortBy
      ? { [query.sortBy]: query.sortDir === 'desc' ? -1 : 1 }
      : { nombre: 1 };

    const [data, total] = await Promise.all([
      this.clienteModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        // "Personal" (Frontend) muestra los responsables con nombre/email
        // reales, no solo el ID — ver `responsableIds` en `cliente.schema.ts`.
        .populate('responsableIds', 'nombre email')
        .exec(),
      this.clienteModel.countDocuments(filter).exec(),
    ]);

    return { data: await this.attachResponsablesEfectivos(data, estudioId), total, page, limit };
  }

  async findOne(id: string, estudioId: Types.ObjectId): Promise<Record<string, unknown>> {
    const cliente = await this.findOneDocument(id, estudioId);
    const [withResponsables] = await this.attachResponsablesEfectivos([cliente], estudioId);
    return withResponsables;
  }

  private async findOneDocument(id: string, estudioId: Types.ObjectId): Promise<ClienteDocument> {
    const cliente = await this.clienteModel
      .findOne({ _id: id, estudioId })
      .populate('responsableIds', 'nombre email')
      .exec();
    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return cliente;
  }

  async create(dto: CreateClienteDto, estudioId: Types.ObjectId): Promise<ClienteDocument> {
    const cuit = normalizeCuit(dto.cuit);
    const existing = await this.clienteModel.findOne({ cuit }).exec();
    if (existing) {
      throw new ConflictException('Ya existe un cliente con ese CUIT');
    }
    await this.validarMotorIaPreferido(dto, estudioId);

    return this.clienteModel.create({ ...dto, cuit, estudioId });
  }

  async update(
    id: string,
    dto: UpdateClienteDto,
    estudioId: Types.ObjectId,
  ): Promise<Record<string, unknown>> {
    const cliente = await this.findOneDocument(id, estudioId);
    await this.validarMotorIaPreferido(dto, estudioId);
    const { responsableIds, ...rest } = dto;
    Object.assign(cliente, { ...rest, cuit: dto.cuit ? normalizeCuit(dto.cuit) : cliente.cuit });
    // Se maneja aparte del spread de arriba: `undefined` (campo ausente del
    // body) = no tocar la asignación actual; `[]` = vaciarla; un array con
    // IDs = reemplazarla tal cual (el Frontend arma el array completo antes
    // de mandarlo — ver `agregarResponsableCliente`/`quitarResponsableCliente`
    // en `clientes/api.ts` del Frontend, que primero leen la asignación
    // actual del cliente para no perder a otros integrantes ya asignados).
    if (responsableIds !== undefined) {
      cliente.responsableIds = responsableIds.map(
        (responsableId) => new Types.ObjectId(responsableId),
      );
    }
    await cliente.save();
    // `responsableIds` quedó con ObjectIds sin poblar tras el `save()` (se
    // reasignó arriba con IDs crudos) — hace falta volver a poblarlo antes
    // de armar `responsablesEfectivos`, si no `attachResponsablesEfectivos`
    // ve objetos sin `nombre`/`email`.
    await cliente.populate('responsableIds', 'nombre email');
    const [withResponsables] = await this.attachResponsablesEfectivos([cliente], estudioId);
    return withResponsables;
  }

  async deactivate(id: string, estudioId: Types.ObjectId): Promise<void> {
    const cliente = await this.findOneDocument(id, estudioId);
    cliente.activo = false;
    await cliente.save();
  }
}
