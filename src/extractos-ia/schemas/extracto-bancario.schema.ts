import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { baseSchemaOptions } from '../../common/database/base-schema.options';

export type ExtractoBancarioDocument = HydratedDocument<ExtractoBancario>;

export enum EstadoExtracto {
  PENDIENTE = 'pendiente',
  PROCESANDO = 'procesando',
  PROCESADO = 'procesado',
  ERROR = 'error',
}

export enum TipoMovimiento {
  DEBITO = 'debito',
  CREDITO = 'credito',
}

/**
 * Movimiento individual extraído del PDF (o editado a mano por el contador —
 * checklist FOLGAR-009: "Tabla de resultados editables antes de confirmar").
 *
 * `fecha` se guarda como texto libre (no `Date`) a propósito: viene tal cual
 * la devuelve el proveedor de IA a partir de lo impreso en el extracto, y el
 * contador la puede editar en un campo de texto simple sin lidiar con parsing
 * de formatos regionales ni zonas horarias. Si en el futuro se necesita
 * ordenar/filtrar por fecha real, se puede sumar un campo `Date` derivado sin
 * romper este.
 */
@Schema({ _id: true })
export class MovimientoExtracto {
  @Prop({ required: true, trim: true })
  fecha: string;

  @Prop({ required: true, trim: true })
  concepto: string;

  @Prop({ required: true })
  monto: number;

  @Prop({ type: String, enum: TipoMovimiento })
  tipo?: TipoMovimiento;
}

export const MovimientoExtractoSchema = SchemaFactory.createForClass(MovimientoExtracto);

/**
 * Extracto bancario cargado por el contador y procesado (o no) por el puerto
 * de IA (`AiExtractionPort`). Módulo "Procesador de Extractos con IA"
 * (backlog FOLGAR-007 a FOLGAR-012).
 *
 * `subtotalesPorConcepto` NO se persiste en este schema — se calcula al vuelo
 * en `ExtractosIaService` a partir de `movimientos` (ver
 * `calcularSubtotalesPorConcepto`). Se decide así porque `movimientos` se
 * puede editar después de la extracción inicial (`actualizarMovimientos`);
 * persistir un subtotal derivado abriría la puerta a que quede desactualizado
 * respecto de los movimientos reales si se olvida recalcularlo en cada
 * edición. Recalcularlo en cada lectura es barato (la cantidad de movimientos
 * de un extracto mensual es chica) y garantiza que nunca esté desincronizado.
 */
@Schema(baseSchemaOptions)
export class ExtractoBancario {
  @Prop({ type: Types.ObjectId, ref: 'Cliente', required: true, index: true })
  clienteId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  nombreArchivo: string;

  @Prop({
    type: String,
    enum: EstadoExtracto,
    required: true,
    default: EstadoExtracto.PENDIENTE,
  })
  estado: EstadoExtracto;

  @Prop({ type: [MovimientoExtractoSchema], default: [] })
  movimientos: MovimientoExtracto[];

  /** Mensaje de error del procesamiento (PDF sin capa de texto, banco no soportado, etc.). */
  @Prop({ trim: true })
  mensajeError?: string;

  @Prop({ type: Types.ObjectId, ref: 'Estudio', required: true, index: true })
  estudioId: Types.ObjectId;
}

export const ExtractoBancarioSchema = SchemaFactory.createForClass(ExtractoBancario);
ExtractoBancarioSchema.index({ estudioId: 1, clienteId: 1 });
