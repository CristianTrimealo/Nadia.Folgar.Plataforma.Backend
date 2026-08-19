import { z } from 'zod/v4';

/**
 * Schema de salida estructurada y prompt de sistema, compartidos entre los
 * adapters de `AiExtractionPort` (Anthropic, OpenAI) — la tarea es la misma
 * sin importar el proveedor: transcribir la tabla de movimientos de un
 * extracto bancario argentino a JSON, sin clasificar ni interpretar. Se
 * extrae a un módulo aparte para no duplicar el schema/prompt entre
 * adapters.
 */
export const MovimientoSchema = z.object({
  fecha: z.string(),
  concepto: z.string(),
  monto: z.number(),
  tipo: z.enum(['debito', 'credito']).nullable(),
  numeroComprobante: z.string().nullable(),
  /** Saldo en cuenta que el extracto declara para esta fila, si el banco lo imprime. */
  saldoDespues: z.number().nullable(),
});

export const ExtraccionSchema = z.object({
  /** Saldo declarado en el encabezado del extracto (ej. fila "Saldo Inicial"). null si el banco no lo imprime. */
  saldoInicialDeclarado: z.number().nullable(),
  /** Saldo final declarado al pie/resumen del extracto. null si el banco no lo imprime. */
  saldoFinalDeclarado: z.number().nullable(),
  movimientos: z.array(MovimientoSchema),
});

export const PROMPT_SISTEMA = `Sos un asistente contable que estructura extractos bancarios argentinos (de cualquier banco) a partir de su texto plano.

Tu única tarea es transcribir la tabla de movimientos a JSON — no clasificás, no interpretás, no resumís. Extraé TODOS los movimientos en el mismo orden en que aparecen en el extracto, sin omitir ninguno y sin inventar ninguno.

Para cada movimiento:
- "fecha": tal como aparece impresa (no normalices el formato).
- "concepto": la descripción completa del movimiento (puede incluir varias líneas de detalle).
- "monto": siempre positivo — el signo lo indica el campo "tipo".
- "tipo": "debito" si el monto está en la columna Débito, "credito" si está en la columna Crédito. Si el extracto no distingue columnas de débito/crédito, usá null.
- "numeroComprobante": el número de comprobante/operación si el extracto lo imprime, si no null.
- "saldoDespues": el saldo en cuenta que el extracto declara para ESA fila específica (columna "Saldo" o "Saldo en cuenta"), si el banco lo imprime línea por línea. Si el banco no imprime un saldo corrido por fila, usá null — no lo calcules vos.

Además, si el extracto tiene una fila explícita de "Saldo Inicial" en el encabezado, informala en "saldoInicialDeclarado". Si tiene un saldo final de cierre/resumen, informalo en "saldoFinalDeclarado". Si no aparecen impresos, usá null — no los calcules.

Es crítico que los montos y saldos sean exactamente los que están impresos, sin errores de transcripción — de esto depende una validación contable automática posterior.`;

export function construirMensajeUsuario(input: {
  nombreArchivo: string;
  texto: string;
  pistaRevision?: string;
}): string {
  const partes = [`Extracto: "${input.nombreArchivo}".`, '', 'TEXTO DEL EXTRACTO:', input.texto];

  if (input.pistaRevision) {
    partes.push(
      '',
      'REVISIÓN REQUERIDA: la extracción anterior tuvo diferencias de saldo en las siguientes filas. Releé con cuidado esa sección del texto y corregí los valores.',
      input.pistaRevision,
    );
  }

  return partes.join('\n');
}
