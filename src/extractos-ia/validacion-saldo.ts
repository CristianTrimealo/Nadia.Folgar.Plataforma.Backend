import {
  EstadoExtracto,
  MovimientoExtracto,
  TipoMovimiento,
  ValidacionSaldo,
} from './schemas/extracto-bancario.schema';

/** Tolerancia de redondeo para considerar que un saldo declarado y uno calculado coinciden. */
export const TOLERANCIA_SALDO = 0.01;

export interface MovimientoValidable {
  fecha: string;
  concepto: string;
  monto: number;
  tipo?: TipoMovimiento;
  numeroComprobante?: string;
  saldoDeclarado?: number;
}

function signedDelta(mov: { monto: number; tipo?: TipoMovimiento }): number {
  if (mov.tipo === TipoMovimiento.DEBITO) return -Math.abs(mov.monto);
  if (mov.tipo === TipoMovimiento.CREDITO) return Math.abs(mov.monto);
  return mov.monto;
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Validación de saldo determinística — nunca delegada a la IA. Extraída como
 * funciones puras (en vez de vivir en `ExtractosIaService`) porque la usan
 * dos consumidores distintos: `ExtractosIaService.actualizarMovimientos`
 * (edición manual, síncrona) y `ExtractosIaProcessor` (el job async que
 * procesa la carga inicial) — así ninguno de los dos duplica esta lógica.
 *
 * Valida cada movimiento contra el saldo que el extracto declara para esa
 * fila: `saldoCalculado = saldoAnterior +/- movimiento`, comparado contra
 * `saldoDeclarado`. Cuando el saldo declarado de la fila está disponible, se
 * usa como ancla para la fila siguiente (en vez de encadenar el saldo
 * puramente calculado) — así un único error de transcripción no arrastra
 * diferencias en cascada al resto del extracto.
 */
export function construirMovimientosConValidacion(
  movimientos: MovimientoValidable[],
  saldoInicialDeclarado: number | undefined,
): MovimientoExtracto[] {
  let saldoAncla = saldoInicialDeclarado;

  return movimientos.map((mov) => {
    const base = {
      fecha: mov.fecha,
      concepto: mov.concepto,
      monto: mov.monto,
      tipo: mov.tipo,
      numeroComprobante: mov.numeroComprobante,
      saldoDeclarado: mov.saldoDeclarado,
    };

    if (saldoAncla === undefined) {
      return { ...base, validacionSaldo: ValidacionSaldo.NO_APLICA };
    }

    const saldoCalculado = redondear(saldoAncla + signedDelta(mov));

    if (mov.saldoDeclarado === undefined) {
      saldoAncla = saldoCalculado;
      return {
        ...base,
        saldoCalculado,
        validacionSaldo: ValidacionSaldo.NO_APLICA,
      };
    }

    const diferenciaSaldo = redondear(mov.saldoDeclarado - saldoCalculado);
    const validacionSaldo =
      Math.abs(diferenciaSaldo) <= TOLERANCIA_SALDO
        ? ValidacionSaldo.OK
        : ValidacionSaldo.DIFERENCIA;

    saldoAncla = mov.saldoDeclarado;

    return { ...base, saldoCalculado, diferenciaSaldo, validacionSaldo };
  });
}

export function contarDiferencias(movimientos: MovimientoExtracto[]): number {
  return movimientos.filter((m) => m.validacionSaldo === ValidacionSaldo.DIFERENCIA).length;
}

export function describirDiferencias(movimientos: MovimientoExtracto[]): string {
  return movimientos
    .filter((m) => m.validacionSaldo === ValidacionSaldo.DIFERENCIA)
    .map(
      (m) =>
        `- Fecha ${m.fecha}, "${m.concepto}": saldo declarado ${m.saldoDeclarado}, saldo esperado ${m.saldoCalculado} (diferencia ${m.diferenciaSaldo}).`,
    )
    .join('\n');
}

export function determinarEstadoFinal(
  movimientos: MovimientoExtracto[],
  saldoFinalDeclarado: number | undefined,
): EstadoExtracto {
  if (contarDiferencias(movimientos) > 0) {
    return EstadoExtracto.REQUIERE_REVISION;
  }

  const saldoFinalCalculado = [...movimientos]
    .reverse()
    .find((m) => m.saldoCalculado !== undefined)?.saldoCalculado;

  if (saldoFinalDeclarado !== undefined && saldoFinalCalculado !== undefined) {
    const diferenciaFinal = redondear(saldoFinalDeclarado - saldoFinalCalculado);
    if (Math.abs(diferenciaFinal) > TOLERANCIA_SALDO) {
      return EstadoExtracto.REQUIERE_REVISION;
    }
  }

  return EstadoExtracto.PROCESADO;
}
