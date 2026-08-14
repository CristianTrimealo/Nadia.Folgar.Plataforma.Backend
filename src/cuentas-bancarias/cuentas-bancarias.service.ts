import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { CuentaBancaria, CuentaBancariaDocument } from './schemas/cuenta-bancaria.schema';
import { CreateCuentaBancariaDto } from './dto/create-cuenta-bancaria.dto';
import { UpdateCuentaBancariaDto } from './dto/update-cuenta-bancaria.dto';
import { QueryCuentaBancariaDto } from './dto/query-cuenta-bancaria.dto';
import { PaginatedResult } from '../common/dto/pagination-query.dto';
import { ClientesService } from '../clientes/clientes.service';
import { PlanCuentasService } from '../plan-cuentas/plan-cuentas.service';

@Injectable()
export class CuentasBancariasService {
  constructor(
    @InjectModel(CuentaBancaria.name)
    private readonly cuentaBancariaModel: Model<CuentaBancariaDocument>,
    private readonly clientesService: ClientesService,
    private readonly planCuentasService: PlanCuentasService,
  ) {}

  async findAll(
    query: QueryCuentaBancariaDto,
    estudioId: Types.ObjectId,
  ): Promise<PaginatedResult<CuentaBancariaDocument>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const filter: FilterQuery<CuentaBancariaDocument> = { estudioId };
    if (query.clienteId) {
      filter.clienteId = new Types.ObjectId(query.clienteId);
    }
    if (query.search) {
      filter.$or = [
        { banco: { $regex: query.search, $options: 'i' } },
        { alias: { $regex: query.search, $options: 'i' } },
        { numeroCuenta: { $regex: query.search, $options: 'i' } },
      ];
    }

    const sort: Record<string, 1 | -1> = query.sortBy
      ? { [query.sortBy]: query.sortDir === 'desc' ? -1 : 1 }
      : { banco: 1 };

    const [data, total] = await Promise.all([
      this.cuentaBancariaModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.cuentaBancariaModel.countDocuments(filter).exec(),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string, estudioId: Types.ObjectId): Promise<CuentaBancariaDocument> {
    const cuenta = await this.cuentaBancariaModel.findOne({ _id: id, estudioId }).exec();
    if (!cuenta) {
      throw new NotFoundException('Cuenta bancaria no encontrada');
    }
    return cuenta;
  }

  /** Valida que `cuentaContableId` exista y pertenezca al mismo cliente. */
  private async assertCuentaContablePerteneceAlCliente(
    cuentaContableId: string,
    clienteId: string,
    estudioId: Types.ObjectId,
  ): Promise<void> {
    const cuentaContable = await this.planCuentasService.findOne(cuentaContableId, estudioId);
    if (cuentaContable.clienteId.toString() !== clienteId) {
      throw new BadRequestException(
        'La cuenta contable de contrapartida debe pertenecer al mismo cliente',
      );
    }
  }

  async create(
    dto: CreateCuentaBancariaDto,
    estudioId: Types.ObjectId,
  ): Promise<CuentaBancariaDocument> {
    await this.clientesService.findOne(dto.clienteId, estudioId);
    await this.assertCuentaContablePerteneceAlCliente(
      dto.cuentaContableId,
      dto.clienteId,
      estudioId,
    );

    return this.cuentaBancariaModel.create({ ...dto, estudioId });
  }

  async update(
    id: string,
    dto: UpdateCuentaBancariaDto,
    estudioId: Types.ObjectId,
  ): Promise<CuentaBancariaDocument> {
    const cuenta = await this.findOne(id, estudioId);

    const nextClienteId = dto.clienteId ?? cuenta.clienteId.toString();
    if (dto.clienteId) {
      await this.clientesService.findOne(dto.clienteId, estudioId);
    }
    if (dto.cuentaContableId) {
      await this.assertCuentaContablePerteneceAlCliente(
        dto.cuentaContableId,
        nextClienteId,
        estudioId,
      );
    }

    Object.assign(cuenta, dto);
    await cuenta.save();
    return cuenta;
  }
}
