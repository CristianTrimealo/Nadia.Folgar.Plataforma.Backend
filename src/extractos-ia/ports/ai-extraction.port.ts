/**
 * Puerto de extracción de movimientos bancarios vía IA (patrón puerto/adapter
 * — ver ADR #5 en CLAUDE.md: "Puerto/adapter para toda integración externa",
 * mismo estilo que `CatedralSyncPort` en `src/catedral/ports/catedral-sync.port.ts`).
 *
 * Al día de hoy todavía NO está confirmado qué proveedor de IA se va a usar
 * (ni OpenAI, ni Anthropic, ni ningún otro) — esa decisión depende de una
 * conversación comercial/técnica que todavía no pasó. Por eso este contrato
 * se mantiene deliberadamente mínimo y agnóstico del proveedor: recibe un PDF
 * ya codificado en base64 y devuelve movimientos estructurados, sin exponer
 * nada específico de ningún SDK.
 *
 * `ExtractosIaService` depende únicamente de esta interfaz, inyectada vía el
 * token `AI_EXTRACTION_PORT` (nunca de una clase concreta). El día de mañana
 * se puede escribir un adapter real (p. ej. `OpenAiExtractionAdapter` o
 * `AnthropicExtractionAdapter`) que implemente este mismo puerto sin tocar el
 * resto del sistema — alcanza con cambiar el `useClass` del provider en
 * `extractos-ia.module.ts`.
 */

/** Tipo de movimiento bancario. Opcional: no todos los extractos/bancos lo distinguen con claridad. */
export type TipoMovimientoExtraido = 'debito' | 'credito';

export interface MovimientoExtraido {
  /** Fecha del movimiento tal como aparece en el extracto (texto libre — ver decisión en el schema). */
  fecha: string;
  /** Descripción/concepto del movimiento, usada además para agrupar subtotales. */
  concepto: string;
  /** Monto del movimiento. Convención: positivo = crédito, negativo = débito, salvo que `tipo` lo aclare. */
  monto: number;
  tipo?: TipoMovimientoExtraido;
}

export interface ExtraccionResultado {
  /** true si el adapter pudo extraer movimientos del PDF. */
  exitoso: boolean;
  /** Movimientos extraídos. Vacío si `exitoso` es false. */
  movimientos: MovimientoExtraido[];
  /**
   * Mensaje legible para humanos. Se usa tanto para detalle de éxito como,
   * sobre todo, para casos de error (ej. "PDF sin capa de texto, probablemente
   * escaneado" — checklist FOLGAR-010: "Detectar PDFs sin capa de texto").
   */
  mensaje?: string;
}

export interface AiExtractionPort {
  /**
   * Extrae los movimientos estructurados de un extracto bancario en PDF.
   * `contenidoBase64` es el PDF completo codificado en base64 (ver decisión
   * de scope: no se maneja upload multipart, ver `CreateExtractoDto`).
   */
  extraerMovimientos(input: {
    nombreArchivo: string;
    contenidoBase64: string;
  }): Promise<ExtraccionResultado>;
}

/**
 * Token de inyección de dependencias para `AiExtractionPort`. Se inyecta con
 * `@Inject(AI_EXTRACTION_PORT)` en vez de acoplarse a un adapter concreto.
 */
export const AI_EXTRACTION_PORT = Symbol('AI_EXTRACTION_PORT');
