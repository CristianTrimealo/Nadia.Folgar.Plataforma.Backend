import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Cliente, ClienteDocument } from './schemas/cliente.schema';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { QueryClienteDto } from './dto/query-cliente.dto';
import { PaginatedResult } from '../common/dto/pagination-query.dto';

function normalizeCuit(cuit: string): string {
  return cuit.replace(/-/g, '');
}

@Injectable()
export class ClientesService {
  constructor(@InjectModel(Cliente.name) private readonly clienteModel: Model<ClienteDocument>) {}

  async findAll(
    query: QueryClienteDto,
    estudioId: Types.ObjectId,
  ): Promise<PaginatedResult<ClienteDocument>> {
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
        .exec(),
      this.clienteModel.countDocuments(filter).exec(),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string, estudioId: Types.ObjectId): Promise<ClienteDocument> {
    const cliente = await this.clienteModel.findOne({ _id: id, estudioId }).exec();
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

    return this.clienteModel.create({ ...dto, cuit, estudioId });
  }

  async update(
    id: string,
    dto: UpdateClienteDto,
    estudioId: Types.ObjectId,
  ): Promise<ClienteDocument> {
    const cliente = await this.findOne(id, estudioId);
    Object.assign(cliente, { ...dto, cuit: dto.cuit ? normalizeCuit(dto.cuit) : cliente.cuit });
    await cliente.save();
    return cliente;
  }

  async deactivate(id: string, estudioId: Types.ObjectId): Promise<void> {
    const cliente = await this.findOne(id, estudioId);
    cliente.activo = false;
    await cliente.save();
  }
}
