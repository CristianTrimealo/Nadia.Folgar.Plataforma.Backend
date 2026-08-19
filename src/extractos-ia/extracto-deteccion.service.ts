import { Injectable } from '@nestjs/common';

export interface EncabezadoDetectado {
  /** CUIT normalizado con guiones (ej. "30-71234567-8"), si se encontró alguno con formato válido. */
  cuitDetectado?: string;
  /** Mes que cubre el extracto, formato "YYYY-MM", si se pudo inferir con confianza. */
  periodoDetectado?: string;
}

/** Cantidad mínima de fechas repetidas con el mismo mes/año para inferir el período por moda. */
const MINIMO_REPETICIONES_FECHA = 2;

const REGEX_CUIT = /(\d{2})-?(\d{8})-?(\d{1})/g;
const REGEX_FECHA = /(\d{2})[/-](\d{2})[/-](\d{4})/g;
const REGEX_PERIODO_CON_FECHA = /per[ií]odo[^\d]{0,15}\d{1,2}[/-](\d{2})[/-](\d{4})/i;

const MESES_ES: Record<string, string> = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  septiembre: '09',
  setiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12',
};

const REGEX_PERIODO_CON_MES = new RegExp(
  `per[ií]odo[^\\d]{0,20}?(${Object.keys(MESES_ES).join('|')})[^\\d]{0,5}(\\d{4})`,
  'i',
);

/**
 * Detección determinística (sin IA) de CUIT y período a partir del texto plano
 * ya extraído de un extracto bancario, para el flujo de auto-detección
 * previo a la carga (ver `POST /extractos-ia/analizar`). Mismo espíritu que
 * `PdfTextExtractorService`: nunca delegarle a un LLM algo que un dato de
 * formato fijo (CUIT) o una búsqueda de palabra clave (período) puede resolver
 * con certeza.
 *
 * Es deliberadamente conservador: si no encuentra un dato con confianza
 * razonable, devuelve `undefined` en vez de adivinar — quien llama (el
 * contador, vía el Frontend) completa el dato a mano, igual que antes de que
 * existiera esta detección.
 */
@Injectable()
export class ExtractoDeteccionService {
  detectar(texto: string): EncabezadoDetectado {
    return {
      cuitDetectado: this.detectarCuit(texto),
      periodoDetectado: this.detectarPeriodo(texto),
    };
  }

  /**
   * Prioriza el CUIT que aparece cerca de la palabra "CUIT" (más confiable:
   * es casi siempre el del titular de la cuenta, no un número de comprobante
   * con el mismo largo por casualidad). Si no hay ninguno con esa cercanía,
   * cae al primer CUIT con formato válido que aparezca en el texto.
   */
  private detectarCuit(texto: string): string | undefined {
    const indiceCuit = texto.search(/cuit/i);
    if (indiceCuit >= 0) {
      const ventana = texto.slice(indiceCuit, indiceCuit + 40);
      const matchCercano = ventana.match(/(\d{2})-?(\d{8})-?(\d{1})/);
      if (matchCercano) {
        return this.normalizarCuit(matchCercano);
      }
    }

    REGEX_CUIT.lastIndex = 0;
    const primerMatch = REGEX_CUIT.exec(texto);
    return primerMatch ? this.normalizarCuit(primerMatch) : undefined;
  }

  private normalizarCuit(match: RegExpMatchArray): string {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  /**
   * Primero busca una mención explícita "Período ... dd/mm/yyyy" o
   * "Período ... <mes en español> yyyy" en el encabezado. Si no hay, cae a la
   * moda (mes, año) de todas las fechas dd/mm/yyyy del texto — con un mínimo
   * de repeticiones para no adivinar un período a partir de una única fecha
   * suelta (ej. la fecha de un comprobante aislado).
   */
  private detectarPeriodo(texto: string): string | undefined {
    const matchFecha = texto.match(REGEX_PERIODO_CON_FECHA);
    if (matchFecha) {
      return `${matchFecha[2]}-${matchFecha[1]}`;
    }

    const matchMes = texto.match(REGEX_PERIODO_CON_MES);
    if (matchMes) {
      const mes = MESES_ES[matchMes[1].toLowerCase()];
      const anio = matchMes[2];
      return `${anio}-${mes}`;
    }

    return this.detectarPeriodoPorModaDeFechas(texto);
  }

  private detectarPeriodoPorModaDeFechas(texto: string): string | undefined {
    const conteos = new Map<string, number>();

    REGEX_FECHA.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = REGEX_FECHA.exec(texto)) !== null) {
      const [, , mes, anio] = match;
      const mesNumero = Number(mes);
      if (mesNumero < 1 || mesNumero > 12) continue;
      const clave = `${anio}-${mes}`;
      conteos.set(clave, (conteos.get(clave) ?? 0) + 1);
    }

    let mejorClave: string | undefined;
    let mejorConteo = 0;
    for (const [clave, conteo] of conteos) {
      if (conteo > mejorConteo) {
        mejorClave = clave;
        mejorConteo = conteo;
      }
    }

    return mejorConteo >= MINIMO_REPETICIONES_FECHA ? mejorClave : undefined;
  }
}
