import { Injectable, Logger } from '@nestjs/common';
import {
  DatosEmision,
  FacturacionElectronicaPort,
  ResultadoEmision,
} from '../ports/facturacion-electronica.port';

/**
 * STUB — no emite ningún comprobante real. No hay certificado digital, no
 * hay webservice confirmado (Catedral vs. ARCA directo, ver FOLGAR-052), y
 * emitir un comprobante fiscal real es exactamente el tipo de acción
 * irreversible que este proyecto NO debe improvisar sin confirmación
 * explícita del cliente. Reemplazar por el adapter real recién cuando esa
 * vía esté decidida y se hayan confirmado credenciales/certificado.
 */
@Injectable()
export class FacturacionStubAdapter implements FacturacionElectronicaPort {
  private readonly logger = new Logger(FacturacionStubAdapter.name);

  async emitirComprobante(datos: DatosEmision): Promise<ResultadoEmision> {
    this.logger.warn(
      `[STUB] Se simuló la emisión de un comprobante para "${datos.clienteNombre}" ` +
        `(CUIT ${datos.clienteCuit}) por $${datos.monto} — no se emitió nada real.`,
    );

    return Promise.resolve({
      exitoso: true,
      cae: `STUB-${Date.now()}`,
      numeroComprobante: `0000-${Math.floor(Math.random() * 100000)
        .toString()
        .padStart(8, '0')}`,
      mensaje: 'Comprobante simulado por el adapter stub — no tiene validez fiscal real.',
    });
  }
}
