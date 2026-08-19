import { Injectable, Logger } from '@nestjs/common';
import {
  AiExtractionInput,
  AiExtractionPort,
  ExtraccionResultado,
  ReglaClasificacionSugerida,
} from '../ports/ai-extraction.port';

/**
 * ============================================================================
 *  PLACEHOLDER — NO ES UNA INTEGRACIÓN REAL CONTRA NINGÚN PROVEEDOR DE IA
 * ============================================================================
 * Selectable vía `AI_PROVIDER=stub` (default en desarrollo/tests, ver
 * `extractos-ia.module.ts`) — no llama a ningún servicio externo, no usa API
 * keys, no hace peticiones HTTP: solo loguea la operación (con el Logger de
 * Nest, dejando explícito que es un stub) y devuelve movimientos de ejemplo
 * fijos y consistentes con su propio saldo (para poder ejercitar el flujo
 * completo de carga → validación de saldo → revisión sin depender de una
 * API key real).
 *
 * Convención SOLO para este stub: si el nombre de archivo contiene "error"
 * (sin distinguir mayúsculas), simula que la IA no pudo estructurar el texto
 * — para poder probar el camino de error sin un proveedor real. La detección
 * de PDFs sin capa de texto (FOLGAR-010) NO pasa por acá: ocurre antes, en
 * `PdfTextExtractorService`, sobre el PDF real.
 *
 * Si viene `cuentasContablesDisponibles` (no vacío), simula además la
 * inferencia de reglas de clasificación: sugiere mapear "Comisión
 * mantenimiento" (uno de los movimientos de ejemplo de acá abajo) a la
 * primera cuenta de la lista — determinístico, para poder probar el flujo
 * completo (extracto → regla sugerida → asiento agrupado) en dev/tests sin
 * depender de una API key real.
 * ============================================================================
 */
@Injectable()
export class AiExtractionStubAdapter implements AiExtractionPort {
  private readonly logger = new Logger(AiExtractionStubAdapter.name);

  extraerMovimientos(input: AiExtractionInput): Promise<ExtraccionResultado> {
    this.logger.warn(
      `[STUB] extraerMovimientos() invocado con nombreArchivo="${input.nombreArchivo}" (AI_PROVIDER=stub)`,
    );

    if (/error/i.test(input.nombreArchivo)) {
      return Promise.resolve({
        exitoso: false,
        movimientos: [],
        reglasSugeridas: [],
        mensaje: 'No se pudo estructurar el extracto. Simulado por el adapter stub.',
      });
    }

    const primeraCuenta = input.cuentasContablesDisponibles?.[0];
    const reglasSugeridas: ReglaClasificacionSugerida[] = primeraCuenta
      ? [
          {
            patronTexto: 'Comisión mantenimiento',
            cuentaCodigo: primeraCuenta.codigo,
            ladoAsiento: 'debe',
            tipoMovimiento: 'debito',
          },
        ]
      : [];

    return Promise.resolve({
      exitoso: true,
      mensaje: 'Simulado: extracción de ejemplo generada por el adapter stub.',
      saldoInicialDeclarado: 100000,
      saldoFinalDeclarado: 329100,
      reglasSugeridas,
      movimientos: [
        {
          fecha: '2026-08-01',
          concepto: 'Transferencia recibida',
          monto: 150000,
          tipo: 'credito',
          saldoDespues: 250000,
        },
        {
          fecha: '2026-08-03',
          concepto: 'Pago de servicios - Edenor',
          monto: -8500,
          tipo: 'debito',
          saldoDespues: 241500,
        },
        {
          fecha: '2026-08-05',
          concepto: 'Pago de servicios - Edenor',
          monto: -6200,
          tipo: 'debito',
          saldoDespues: 235300,
        },
        {
          fecha: '2026-08-10',
          concepto: 'Comisión mantenimiento de cuenta',
          monto: -1200,
          tipo: 'debito',
          saldoDespues: 234100,
        },
        {
          fecha: '2026-08-15',
          concepto: 'Transferencia recibida',
          monto: 95000,
          tipo: 'credito',
          saldoDespues: 329100,
        },
      ],
    });
  }
}
