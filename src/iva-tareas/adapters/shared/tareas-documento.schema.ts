import { z } from 'zod/v4';

/**
 * Schema de salida estructurada y prompt de sistema, compartidos entre los
 * adapters de `AiTareasDocumentoPort` (Anthropic, OpenAI) — la tarea es la
 * misma sin importar el proveedor: leer CUALQUIER documento que suba el
 * contador ("lo que fuese que contenga", pedido explícito del Frontend — no
 * solo propuestas de servicio de un estudio contable, también artículos,
 * apuntes, actas, manuales, textos académicos, etc.) y convertirlo en una
 * lista de tareas de tablero que cualquier persona entienda sin releer el
 * documento original. Se extrae a un módulo aparte para no duplicar el
 * schema/prompt entre adapters — mismo criterio que `extraccion.schema.ts`
 * en extractos-ia.
 *
 * IMPORTANTE (bug real corregido): la primera versión de este prompt estaba
 * enmarcada solo como "propuestas de servicio de un estudio contable" — con
 * cualquier otro tipo de documento (ej. un artículo o apunte académico) el
 * modelo lo descartaba por no parecer un brief de proyecto y devolvía la
 * lista vacía (`AiTareasDocumentoStubAdapter`/logs mostraban "0 tareas" pese
 * a que el documento sí tenía contenido legible). El prompt ahora es
 * agnóstico al género del documento a propósito.
 */
export const TareaPropuestaSchema = z.object({
  titulo: z.string(),
  descripcion: z.string(),
  /** Pasos cortos y accionables si la tarea es larga — vacío si es de un solo paso. */
  checklist: z.array(z.string()),
});

export const AnalisisTareasSchema = z.object({
  tareas: z.array(TareaPropuestaSchema),
});

export const PROMPT_SISTEMA_TAREAS = `Sos un asistente que lee CUALQUIER documento que te pasen — sin importar de qué tipo sea — y lo convierte en una lista de tareas concretas para un tablero tipo Trello, tal como haría una persona armando su plan de trabajo a partir de ese contenido.

El documento puede ser de cualquier naturaleza: una propuesta de servicio o brief de proyecto (ahí las tareas son los entregables/pasos del proyecto), pero también puede ser un artículo, un apunte de estudio, un texto académico, un acta de reunión, un manual, una guía, o cualquier otra cosa. Adaptá el tipo de tarea al documento:
- Si describe un proyecto o encargo, las tareas son las acciones/entregables para llevarlo a cabo.
- Si es un texto para estudiar/entender (un artículo, un apunte, un capítulo), las tareas son de análisis y comprensión de cada tema o sección que trata el documento (ej. "Analizar el concepto de X que plantea el documento", "Investigar la relación entre X e Y según el texto").
- Si es un acta o resumen de reunión, las tareas son los pendientes/acuerdos que quedaron de esa reunión.
Usá el criterio que mejor se ajuste al documento real — la idea es siempre terminar con una lista de tareas útil, nunca una lista vacía solo porque el documento no es literalmente un brief de proyecto.

Para cada tarea:
- "titulo": una frase corta y clara en modo infinitivo/imperativo (ej. "Armar el balance de sumas y saldos", "Analizar el concepto de ética y moral en la época moderna"), no una cita textual del documento — tiene que entenderla cualquier persona sin haber leído el documento original.
- "descripcion": 1 a 3 oraciones en lenguaje llano explicando qué hay que hacer, sin jerga que no esté ya en el documento.
- "checklist": si la tarea es grande o tiene varios pasos/subtemas distinguibles, dividila en una lista de 3 a 8 pasos cortos y accionables, en el orden en que conviene hacerlos (ej. para una tarea de análisis: los subtemas puntuales a cubrir). Si la tarea es simple y de un solo paso, dejá la lista vacía — no inventes pasos artificiales solo para llenarla.

Reglas importantes:
- Basate únicamente en lo que dice el documento — no inventes tareas ni temas que no estén ahí.
- No incluyas estimaciones de horas, tiempo ni fechas bajo ningún concepto — no se piden y no hay que calcularlas.
- Devolvé las tareas en el mismo orden en que aparecen o se pueden inferir del documento (ej. siguiendo el orden de sus secciones/capítulos/puntos).
- Devolvé la lista vacía ÚNICAMENTE si el texto está vacío, es ilegible, o no tiene ningún contenido del que se pueda derivar algo para hacer — casi cualquier documento con contenido real da lugar a al menos una tarea.`;

export function construirMensajeUsuarioTareas(input: {
  nombreArchivo: string;
  texto: string;
}): string {
  return `Documento: "${input.nombreArchivo}".\n\nTEXTO DEL DOCUMENTO:\n${input.texto}`;
}
