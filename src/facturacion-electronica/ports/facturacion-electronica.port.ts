/**
 * Puerto de emisión de comprobantes electrónicos (patrón puerto/adapter —
 * ver ADR #5 en CLAUDE.md). Todavía NO está confirmado con el cliente si la
 * emisión real va a ir vía Catedral o directo contra el webservice de
 * ARCA/AFIP (FOLGAR-052) — por eso este contrato se mantiene mínimo y el
 * adapter activo hoy es un stub que nunca emite un comprobante real. Ver
 * `adapters/facturacion-stub.adapter.ts`.
 */
export interface DatosEmision {
  clienteNombre: string;
  clienteCuit: string;
  concepto: string;
  monto: number;
}

export interface ResultadoEmision {
  exitoso: boolean;
  cae?: string;
  numeroComprobante?: string;
  mensaje?: string;
}

export interface FacturacionElectronicaPort {
  emitirComprobante(datos: DatosEmision): Promise<ResultadoEmision>;
}

export const FACTURACION_ELECTRONICA_PORT = Symbol('FACTURACION_ELECTRONICA_PORT');
