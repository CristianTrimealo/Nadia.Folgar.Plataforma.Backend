/**
 * Puerto de extracción de movimientos bancarios vía IA (patrón puerto/adapter
 * — ver ADR #5 en CLAUDE.md: "Puerto/adapter para toda integración externa",
 * mismo estilo que `CatedralSyncPort` en `src/catedral/ports/catedral-sync.port.ts`).
 *
 * El adapter recibe el TEXTO ya extraído del PDF (por `PdfTextExtractorService`,
 * determinístico, sin IA) en vez del PDF binario — más barato en tokens y sin
 * los límites de tamaño de documento del proveedor. La única responsabilidad
 * de la IA acá es estructurar ese texto en movimientos; el parseo del PDF y
 * la validación de saldo (fila por fila, contra `saldoDespues`) son 100%
 * determinísticos y viven en `ExtractosIaService`, nunca delegados a la IA.
 *
 * `ExtractosIaService` depende únicamente de esta interfaz, inyectada vía el
 * token `AI_EXTRACTION_PORT` (nunca de una clase concreta) — el proveedor de
 * IA se selecciona por la variable de entorno `AI_PROVIDER` (`stub` en
 * desarrollo/tests, `anthropic` cuando hay `ANTHROPIC_API_KEY` configurada),
 * ver `extractos-ia.module.ts`.
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
  /** Número de comprobante/operación, si el extracto lo imprime. */
  numeroComprobante?: string;
  /** Saldo en cuenta que el extracto declara para ESTA fila, si el banco lo imprime (ej. Santander sí). */
  saldoDespues?: number;
}

export interface ExtraccionResultado {
  /** true si el adapter pudo extraer movimientos del PDF. */
  exitoso: boolean;
  /** Movimientos extraídos, en el mismo orden en que aparecen en el extracto. Vacío si `exitoso` es false. */
  movimientos: MovimientoExtraido[];
  /** Saldo inicial declarado en el encabezado del extracto (ej. fila "Saldo Inicial"), si el banco lo imprime. */
  saldoInicialDeclarado?: number;
  /** Saldo final declarado al pie/resumen del extracto, si el banco lo imprime. */
  saldoFinalDeclarado?: number;
  /**
   * Mensaje legible para humanos. Se usa tanto para detalle de éxito como,
   * sobre todo, para casos de error (ej. "PDF sin capa de texto, probablemente
   * escaneado" — checklist FOLGAR-010: "Detectar PDFs sin capa de texto").
   */
  mensaje?: string;
}

export interface AiExtractionInput {
  nombreArchivo: string;
  /** Texto plano del PDF, ya extraído por `PdfTextExtractorService` — nunca el binario. */
  texto: string;
  /**
   * Presente solo en el reintento acotado (máx. 1) que dispara
   * `ExtractosIaService` cuando la validación de saldo fila por fila
   * encuentra diferencias: describe qué filas no cuadraron y qué saldo se
   * esperaba, para que el adapter pueda pedirle a la IA que las revise sin
   * reprocesar el documento completo de nuevo.
   */
  pistaRevision?: string;
}

export interface AiExtractionPort {
  extraerMovimientos(input: AiExtractionInput): Promise<ExtraccionResultado>;
}

/**
 * Token de inyección de dependencias para `AiExtractionPort`. Se inyecta con
 * `@Inject(AI_EXTRACTION_PORT)` en vez de acoplarse a un adapter concreto.
 */
export const AI_EXTRACTION_PORT = Symbol('AI_EXTRACTION_PORT');
