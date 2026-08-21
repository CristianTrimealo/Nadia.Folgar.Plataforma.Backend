/**
 * Puerto de análisis de documentos vía IA para "Importar tareas desde
 * documento" (patrón puerto/adapter — ver ADR #5 en CLAUDE.md, mismo estilo
 * que `AiExtractionPort` en extractos-ia).
 *
 * El adapter recibe el TEXTO ya extraído del documento (por
 * `DocumentoTextoExtractorService`, determinístico, sin IA) en vez del
 * archivo binario — más barato en tokens y sin límites de tamaño de
 * documento del proveedor. La única responsabilidad de la IA acá es leer
 * ese texto y proponer tareas; la persistencia (recién al confirmar) es
 * 100% determinística y vive en `IvaTareasService`.
 *
 * `IvaTareasService` depende únicamente de esta interfaz, inyectada vía el
 * token `AI_TAREAS_DOCUMENTO_PORT` — el proveedor se selecciona por la misma
 * variable de entorno `AI_PROVIDER` que usa extractos-ia (`stub` en
 * desarrollo/tests, `anthropic`/`openai` con la API key correspondiente),
 * ver `iva-tareas.module.ts`.
 */

/** Una tarea propuesta por la IA — sin horas estimadas, deliberadamente fuera de alcance. */
export interface TareaPropuestaIA {
  titulo: string;
  descripcion: string;
  /** Pasos en los que se dividió la tarea por ser larga — vacío si no hizo falta. */
  checklist: string[];
}

export interface AiTareasDocumentoInput {
  nombreArchivo: string;
  /** Texto plano del documento, ya extraído por `DocumentoTextoExtractorService` — nunca el binario. */
  texto: string;
}

export interface AnalisisTareasResultado {
  /** true si el adapter pudo leer el documento y proponer tareas (incluso si la lista da vacía). */
  exitoso: boolean;
  tareas: TareaPropuestaIA[];
  /** Mensaje legible para humanos — sobre todo para casos de error. */
  mensaje?: string;
}

export interface AiTareasDocumentoPort {
  analizarDocumento(input: AiTareasDocumentoInput): Promise<AnalisisTareasResultado>;
}

/** Token de inyección de dependencias para `AiTareasDocumentoPort`. */
export const AI_TAREAS_DOCUMENTO_PORT = Symbol('AI_TAREAS_DOCUMENTO_PORT');
