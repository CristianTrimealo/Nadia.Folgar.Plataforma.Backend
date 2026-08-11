import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Cliente, ClienteDocument, RegimenFiscal } from '../clientes/schemas/cliente.schema';
import { PaginatedResult } from '../common/dto/pagination-query.dto';
import {
  ChecklistItem,
  EstadoTarea,
  Jurisdiccion,
  TareaPresentacion,
  TareaPresentacionDocument,
} from './schemas/tarea-presentacion.schema';
import { CreateTareaPresentacionDto } from './dto/create-tarea-presentacion.dto';
import { UpdateTareaPresentacionDto } from './dto/update-tarea-presentacion.dto';
import { QueryTareaPresentacionDto } from './dto/query-tarea-presentacion.dto';
import { QueryKanbanDto } from './dto/query-kanban.dto';
import { MoverTareaDto } from './dto/mover-tarea.dto';
import { ChecklistItemDto } from './dto/checklist-item.dto';

export interface GenerarTareasResultado {
  evaluados: number;
  creadas: number;
  omitidas: number;
}

/** Período fiscal actual en formato "YYYY-MM" (calendario de Buenos Aires, sin corrimiento de zona horaria relevante para este caso de uso). */
export function periodoActual(fecha: Date = new Date()): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}`;
}

@Injectable()
export class IvaTareasService {
  private readonly logger = new Logger(IvaTareasService.name);

  constructor(
    @InjectModel(TareaPresentacion.name)
    private readonly tareaModel: Model<TareaPresentacionDocument>,
    @InjectModel(Cliente.name) private readonly clienteModel: Model<ClienteDocument>,
  ) {}

  // ── Generación mensual automática ────────────────────────────────────

  /**
   * Determina qué jurisdicciones le corresponden a un cliente según su
   * `regimenFiscal`.
   *
   * CRITERIO (simplificación documentada — el cálculo real de jurisdicción
   * depende de padrones de IIBB, actividad y domicilio fiscal, y no es el
   * foco de este módulo, ver FOLGAR-046 para el modelo fino):
   *   - TODOS los clientes activos generan tarea de ARCA (IVA nacional).
   *   - Solo `responsable_inscripto` generan además ARBA (IIBB/Convenio
   *     Multilateral) y AGIP (CABA). `monotributo` y `exento` no facturan
   *     IIBB de la misma forma (monotributo tributa por categoría, no por
   *     DDJJ mensual; exento no tiene obligación de IIBB), así que quedan
   *     fuera de esas dos jurisdicciones bajo esta regla simple.
   */
  private determinarJurisdicciones(regimenFiscal: RegimenFiscal): Jurisdiccion[] {
    if (regimenFiscal === RegimenFiscal.RESPONSABLE_INSCRIPTO) {
      return [Jurisdiccion.ARCA, Jurisdiccion.ARBA, Jurisdiccion.AGIP];
    }
    return [Jurisdiccion.ARCA];
  }

  /**
   * Genera la tarea de presentación de cada cliente activo × jurisdicción
   * aplicable para `periodo` (default: mes en curso), sin duplicar si ya
   * existe una tarea para esa combinación cliente+jurisdicción+período
   * (checklist FOLGAR-047).
   *
   * Si se pasa `estudioId` (ej. desde el disparo manual del controller),
   * se limita a los clientes de ese estudio; sin `estudioId` (cron) corre
   * sobre todos los clientes activos de todos los estudios — mismo patrón
   * multi-tenant que `NotificacionesService.evaluarReglas()`.
   */
  async generarTareasDelMes(
    periodo: string = periodoActual(),
    estudioId?: Types.ObjectId,
  ): Promise<GenerarTareasResultado> {
    const filtroClientes: FilterQuery<ClienteDocument> = { activo: true };
    if (estudioId) {
      filtroClientes.estudioId = estudioId;
    }

    const clientes = await this.clienteModel.find(filtroClientes).exec();

    const resultado: GenerarTareasResultado = { evaluados: 0, creadas: 0, omitidas: 0 };
    // Próxima posición libre en la columna "pendiente" por estudio, para no
    // pisar posiciones entre altas del mismo run (se inicializa lazy con el
    // conteo real en Mongo la primera vez que aparece cada estudio).
    const siguientePosicionPendiente = new Map<string, number>();

    for (const cliente of clientes) {
      const jurisdicciones = this.determinarJurisdicciones(cliente.regimenFiscal);

      for (const jurisdiccion of jurisdicciones) {
        resultado.evaluados += 1;

        const yaExiste = await this.tareaModel
          .exists({
            estudioId: cliente.estudioId,
            clienteId: cliente._id,
            jurisdiccion,
            periodo,
          })
          .exec();

        if (yaExiste) {
          resultado.omitidas += 1;
          continue;
        }

        const estudioKey = cliente.estudioId.toString();
        if (!siguientePosicionPendiente.has(estudioKey)) {
          const conteoActual = await this.tareaModel
            .countDocuments({ estudioId: cliente.estudioId, estado: EstadoTarea.PENDIENTE })
            .exec();
          siguientePosicionPendiente.set(estudioKey, conteoActual);
        }
        const posicion = siguientePosicionPendiente.get(estudioKey) ?? 0;
        siguientePosicionPendiente.set(estudioKey, posicion + 1);

        await this.tareaModel.create({
          clienteId: cliente._id,
          jurisdiccion,
          periodo,
          estado: EstadoTarea.PENDIENTE,
          posicion,
          checklist: [],
          estudioId: cliente.estudioId,
        });
        resultado.creadas += 1;
      }
    }

    return resultado;
  }

  /**
   * `CronExpression` no trae una constante para "1er día del mes a la 1am"
   * (solo medianoche/mediodía), así que se usa la expresión cron directa:
   * minuto 0, hora 1, día-de-mes 1, cualquier mes, cualquier día de semana.
   */
  @Cron('0 1 1 * *')
  async generarTareasDelMesCron(): Promise<void> {
    const resultado = await this.generarTareasDelMes();
    this.logger.log(
      `generarTareasDelMes: evaluados=${resultado.evaluados} creadas=${resultado.creadas} ` +
        `omitidas=${resultado.omitidas}`,
    );
  }

  // ── Kanban ──────────────────────────────────────────────────────────

  /**
   * Lista plana de todas las tareas del período pedido (default: mes en
   * curso), ordenada por estado+posición. El Frontend arma las 3 columnas
   * agrupando por `estado` — este método no devuelve la data ya agrupada
   * a propósito, para no acoplar el shape de la respuesta a un layout de
   * UI particular.
   */
  async findKanban(
    estudioId: Types.ObjectId,
    filtros: QueryKanbanDto,
  ): Promise<TareaPresentacionDocument[]> {
    const periodo = filtros.periodo ?? periodoActual();

    const filter: FilterQuery<TareaPresentacionDocument> = { estudioId, periodo };
    if (filtros.jurisdiccion) {
      filter.jurisdiccion = filtros.jurisdiccion;
    }
    if (filtros.asignadoA) {
      filter.asignadoA = new Types.ObjectId(filtros.asignadoA);
    }

    return this.tareaModel
      .find(filter)
      .sort({ estado: 1, posicion: 1 })
      .populate('clienteId', 'nombre cuit regimenFiscal')
      .populate('asignadoA', 'nombre email')
      .exec();
  }

  /**
   * Mueve una tarea a otro estado/posición — lo que el drag & drop del
   * tablero llama al soltar una tarjeta. Reordena de forma simple (no
   * sofisticada): renumera la columna de origen si cambió de columna, y
   * renumera la columna de destino insertando la tarea en el índice pedido.
   */
  async moverTarea(
    id: string,
    dto: MoverTareaDto,
    estudioId: Types.ObjectId,
  ): Promise<TareaPresentacionDocument> {
    const tarea = await this.findOneTarea(id, estudioId);
    const estadoAnterior = tarea.estado;

    if (estadoAnterior !== dto.estado) {
      const restantesOrigen = await this.tareaModel
        .find({ estudioId, estado: estadoAnterior, _id: { $ne: tarea._id } })
        .sort({ posicion: 1 })
        .exec();

      await Promise.all(
        restantesOrigen.map((t, index) =>
          t.posicion === index
            ? Promise.resolve()
            : this.tareaModel.updateOne({ _id: t._id }, { posicion: index }).exec(),
        ),
      );
    }

    // Se trabaja solo con los `_id` de la columna destino (no con los
    // documentos completos): mezclar el documento `tarea` con los que
    // devuelve `.find().exec()` en el mismo array rompe la inferencia de
    // tipos de Mongoose (el `HydratedDocument` queda envuelto dos veces).
    const idsColumnaDestino = (
      await this.tareaModel
        .find({ estudioId, estado: dto.estado, _id: { $ne: tarea._id } })
        .sort({ posicion: 1 })
        .exec()
    ).map((t) => t._id);

    const indiceInsercion = Math.max(0, Math.min(dto.posicion, idsColumnaDestino.length));
    idsColumnaDestino.splice(indiceInsercion, 0, tarea._id);

    await Promise.all(
      idsColumnaDestino.map((tareaId, index) =>
        tareaId.equals(tarea._id)
          ? Promise.resolve()
          : this.tareaModel.updateOne({ _id: tareaId }, { posicion: index }).exec(),
      ),
    );

    tarea.estado = dto.estado;
    tarea.posicion = indiceInsercion;
    await tarea.save();

    return tarea;
  }

  /** `completado` es opcional en el DTO (default false) pero requerido en el subdocumento Mongoose. */
  private mapChecklist(items?: ChecklistItemDto[]): ChecklistItem[] {
    return (items ?? []).map((item) => ({
      texto: item.texto,
      completado: item.completado ?? false,
    }));
  }

  // ── CRUD paginado ───────────────────────────────────────────────────

  async findAllTareas(
    query: QueryTareaPresentacionDto,
    estudioId: Types.ObjectId,
  ): Promise<PaginatedResult<TareaPresentacionDocument>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const filter: FilterQuery<TareaPresentacionDocument> = { estudioId };

    if (query.jurisdiccion) {
      filter.jurisdiccion = query.jurisdiccion;
    }
    if (query.estado) {
      filter.estado = query.estado;
    }
    if (query.asignadoA) {
      filter.asignadoA = new Types.ObjectId(query.asignadoA);
    }
    if (query.clienteId) {
      filter.clienteId = new Types.ObjectId(query.clienteId);
    }
    if (query.periodo) {
      filter.periodo = query.periodo;
    }

    const sort: Record<string, 1 | -1> = query.sortBy
      ? { [query.sortBy]: query.sortDir === 'desc' ? -1 : 1 }
      : { periodo: -1, estado: 1, posicion: 1 };

    const [data, total] = await Promise.all([
      this.tareaModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('clienteId', 'nombre cuit regimenFiscal')
        .populate('asignadoA', 'nombre email')
        .exec(),
      this.tareaModel.countDocuments(filter).exec(),
    ]);

    return { data, total, page, limit };
  }

  async findOneTarea(id: string, estudioId: Types.ObjectId): Promise<TareaPresentacionDocument> {
    const tarea = await this.tareaModel.findOne({ _id: id, estudioId }).exec();
    if (!tarea) {
      throw new NotFoundException('Tarea de presentación no encontrada');
    }
    return tarea;
  }

  async createTarea(
    dto: CreateTareaPresentacionDto,
    estudioId: Types.ObjectId,
  ): Promise<TareaPresentacionDocument> {
    const estado = dto.estado ?? EstadoTarea.PENDIENTE;
    const posicion = await this.tareaModel.countDocuments({ estudioId, estado }).exec();

    return this.tareaModel.create({
      clienteId: new Types.ObjectId(dto.clienteId),
      jurisdiccion: dto.jurisdiccion,
      periodo: dto.periodo,
      estado,
      posicion,
      asignadoA: dto.asignadoA ? new Types.ObjectId(dto.asignadoA) : undefined,
      checklist: this.mapChecklist(dto.checklist),
      estudioId,
    });
  }

  /**
   * Edición de checklist/asignación/cliente/jurisdicción/período.
   * Deliberadamente NO toca `estado` ni `posicion` — esos dos campos son
   * las columnas y el orden del Kanban, y cambiarlos fuera de `moverTarea`
   * rompería la numeración consistente de la columna. Si en el futuro hace
   * falta permitir ese cambio desde este endpoint, tiene que reusar la
   * misma lógica de reordenamiento.
   */
  async updateTarea(
    id: string,
    dto: UpdateTareaPresentacionDto,
    estudioId: Types.ObjectId,
  ): Promise<TareaPresentacionDocument> {
    const tarea = await this.findOneTarea(id, estudioId);

    if (dto.clienteId) {
      tarea.clienteId = new Types.ObjectId(dto.clienteId);
    }
    if (dto.jurisdiccion) {
      tarea.jurisdiccion = dto.jurisdiccion;
    }
    if (dto.periodo) {
      tarea.periodo = dto.periodo;
    }
    if (dto.asignadoA !== undefined) {
      tarea.asignadoA = dto.asignadoA ? new Types.ObjectId(dto.asignadoA) : undefined;
    }
    if (dto.checklist) {
      tarea.checklist = this.mapChecklist(dto.checklist);
    }

    await tarea.save();
    return tarea;
  }
}
