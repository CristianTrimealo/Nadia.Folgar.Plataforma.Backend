import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Estudio, EstudioDocument } from './schemas/estudio.schema';

/**
 * Hoy el sistema es de un solo estudio (Folgar). Este servicio existe para no
 * hardcodear ese supuesto en el resto del código: cualquier módulo que necesite
 * "el estudio actual" pasa por acá en vez de asumir un único registro a mano.
 */
@Injectable()
export class TenancyService implements OnModuleInit {
  private defaultEstudioId: Types.ObjectId | null = null;

  constructor(
    @InjectModel(Estudio.name) private readonly estudioModel: Model<EstudioDocument>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureDefaultEstudio();
  }

  async ensureDefaultEstudio(): Promise<EstudioDocument> {
    const existing = await this.estudioModel.findOne({ activo: true }).exec();
    if (existing) {
      this.defaultEstudioId = existing._id;
      return existing;
    }

    const created = await this.estudioModel.create({
      nombre: 'Estudio Contable Nadia Folgar',
      cuit: this.configService.get<string>('FOLGAR_CUIT', 'pendiente'),
      activo: true,
    });
    this.defaultEstudioId = created._id;
    return created;
  }

  getDefaultEstudioId(): Types.ObjectId {
    if (!this.defaultEstudioId) {
      throw new Error('TenancyService no inicializado todavía');
    }
    return this.defaultEstudioId;
  }
}
