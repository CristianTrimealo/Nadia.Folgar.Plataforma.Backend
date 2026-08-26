import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { IntegracionesService } from './integraciones.service';
import { Estudio, EstudioDocument } from '../tenancy/schemas/estudio.schema';
import { ClientesService } from '../clientes/clientes.service';
import { ProveedorIA } from '../common/enums/proveedor-ia.enum';

export interface CredencialResuelta {
  proveedor: ProveedorIA;
  /** `undefined` si el estudio no conectó ese proveedor en Configuración → Integraciones — el adapter cae a su propia API key de entorno. */
  apiKey?: string;
  modelo?: string;
}

/**
 * Resuelve qué proveedor de IA (y con qué credencial) usar para un proceso
 * puntual, en el momento de ejecutarlo — reemplaza el factory estático
 * `AI_EXTRACTION_PORT`/`AI_CHAT_PORT` (resuelto una sola vez al bootear el
 * proceso, por variable de entorno). Orden de resolución:
 *
 * 1. `Cliente.motorIaPreferido` (solo si se pasa `clienteId` — hay procesos,
 *    como el Asistente IA, que no están atados a ningún cliente).
 * 2. `Estudio.motorIaPorDefecto`.
 * 3. `AI_PROVIDER` de entorno, si no es `stub`.
 * 4. `null` — quien llama cae al adapter stub.
 *
 * Si el proveedor resuelto no tiene una `IntegracionIa` conectada, igual se
 * devuelve (sin `apiKey`) para que el adapter use su propia
 * `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` de entorno — el comportamiento previo
 * a este módulo sigue funcionando sin cambios mientras nadie conecte nada
 * acá.
 */
@Injectable()
export class AiProviderResolverService {
  constructor(
    private readonly integracionesService: IntegracionesService,
    @InjectModel(Estudio.name) private readonly estudioModel: Model<EstudioDocument>,
    private readonly clientesService: ClientesService,
    private readonly configService: ConfigService,
  ) {}

  async resolver(
    estudioId: Types.ObjectId,
    clienteId?: Types.ObjectId,
  ): Promise<CredencialResuelta | null> {
    const proveedor = await this.resolverProveedor(estudioId, clienteId);
    if (!proveedor) {
      return null;
    }

    const credencial = await this.integracionesService.obtenerCredencialDescifrada(
      estudioId,
      proveedor,
    );
    return { proveedor, apiKey: credencial?.apiKey, modelo: credencial?.modelo };
  }

  private async resolverProveedor(
    estudioId: Types.ObjectId,
    clienteId?: Types.ObjectId,
  ): Promise<ProveedorIA | undefined> {
    if (clienteId) {
      const cliente = await this.clientesService.findOne(clienteId.toString(), estudioId);
      const motorIaPreferido = cliente.motorIaPreferido as ProveedorIA | undefined;
      if (motorIaPreferido) {
        return motorIaPreferido;
      }
    }

    const estudio = await this.estudioModel.findById(estudioId).exec();
    if (estudio?.motorIaPorDefecto) {
      return estudio.motorIaPorDefecto;
    }

    const proveedorEnv = this.configService.get<string>('AI_PROVIDER');
    if (proveedorEnv === ProveedorIA.ANTHROPIC || proveedorEnv === ProveedorIA.OPENAI) {
      return proveedorEnv;
    }

    return undefined;
  }
}
