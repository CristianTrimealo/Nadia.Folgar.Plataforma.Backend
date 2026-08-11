import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { baseSchemaOptions } from '../../common/database/base-schema.options';

export type TareaPresentacionDocument = HydratedDocument<TareaPresentacion>;

/** Jurisdicción/organismo ante el que se presenta la obligación. */
export enum Jurisdiccion {
  ARCA = 'ARCA',
  ARBA = 'ARBA',
  AGIP = 'AGIP',
}

/** Estado de la tarea — son, literalmente, las 3 columnas del tablero Kanban. */
export enum EstadoTarea {
  PENDIENTE = 'pendiente',
  EN_CURSO = 'en_curso',
  PRESENTADO = 'presentado',
}

/**
 * Ítem del checklist de una presentación (ej. "Conciliar IVA Ventas", "Subir
 * a ARCA", "Avisar al cliente"). No hay catálogo de checklists por
 * jurisdicción todavía (eso es FOLGAR-048, pendiente de relevar con Nadia) —
 * `checklist` arranca vacío al generar la tarea y el equipo carga los ítems
 * a mano desde el Frontend.
 */
@Schema({ _id: true })
export class ChecklistItem {
  @Prop({ required: true, trim: true })
  texto: string;

  @Prop({ default: false })
  completado: boolean;
}

export const ChecklistItemSchema = SchemaFactory.createForClass(ChecklistItem);

/**
 * Tarea de presentación de un cliente ante una jurisdicción para un período
 * (`"YYYY-MM"`), generada automáticamente todos los meses por
 * `IvaTareasService.generarTareasDelMes()` (ver ese servicio para el criterio
 * de qué jurisdicciones aplican según `regimenFiscal`).
 *
 * `posicion` es el mismo concepto que `position` en el Kanban del CRM de
 * Novaptix: el orden relativo de la tarjeta dentro de su columna (`estado`).
 * Se recalcula de forma simple en `moverTarea` (no hace falta ser
 * sofisticado — ver comentario en el service).
 */
@Schema(baseSchemaOptions)
export class TareaPresentacion {
  @Prop({ type: Types.ObjectId, ref: 'Cliente', required: true, index: true })
  clienteId: Types.ObjectId;

  @Prop({ type: String, enum: Jurisdiccion, required: true })
  jurisdiccion: Jurisdiccion;

  /** Período fiscal de la presentación, formato "YYYY-MM" (ej. "2026-07"). */
  @Prop({ required: true, trim: true })
  periodo: string;

  @Prop({ type: String, enum: EstadoTarea, default: EstadoTarea.PENDIENTE })
  estado: EstadoTarea;

  /** Orden dentro de la columna (`estado`). Mismo concepto que `position` en el Kanban del CRM. */
  @Prop({ default: 0 })
  posicion: number;

  /** Colaboradora asignada a la tarea. Opcional: se puede generar sin asignar y repartir después. */
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  asignadoA?: Types.ObjectId;

  @Prop({ type: [ChecklistItemSchema], default: [] })
  checklist: ChecklistItem[];

  @Prop({ type: Types.ObjectId, ref: 'Estudio', required: true, index: true })
  estudioId: Types.ObjectId;
}

export const TareaPresentacionSchema = SchemaFactory.createForClass(TareaPresentacion);

/**
 * Índice compuesto que respalda tanto la consulta principal del Kanban
 * (`estudioId` + `periodo`) como la deduplicación de `generarTareasDelMes`
 * (`estudioId` + `periodo` + `jurisdiccion` + `clienteId` es la clave lógica
 * de "una tarea por cliente+jurisdicción+período").
 */
TareaPresentacionSchema.index({ estudioId: 1, periodo: 1, jurisdiccion: 1 });
TareaPresentacionSchema.index({ estudioId: 1, periodo: 1, clienteId: 1, jurisdiccion: 1 });
