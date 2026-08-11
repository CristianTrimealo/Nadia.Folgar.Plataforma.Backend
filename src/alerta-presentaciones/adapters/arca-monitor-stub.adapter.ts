import { Injectable, Logger } from '@nestjs/common';
import { ArcaMonitorPort, NovedadDetectada } from '../ports/arca-monitor.port';

/**
 * ============================================================================
 *  PLACEHOLDER — NO ES UNA INTEGRACIÓN REAL CONTRA ARCA
 * ============================================================================
 * Este adapter existe únicamente para que `AlertaPresentacionesService`, el
 * controller, el cron diario y el schema `NovedadFiscal` se puedan
 * desarrollar y testear hoy, sin bloquearse en una decisión que todavía no
 * se tomó.
 *
 * FOLGAR-040 ("Investigar vías de acceso al Domicilio Fiscal Electrónico por
 * cliente") y FOLGAR-041 ("Definir arquitectura del monitoreo de novedades
 * fiscales") todavía no están resueltos con el cliente — no sabemos si el
 * acceso va a ser por delegación de Clave Fiscal, por alguna API oficial de
 * ARCA, o por otra vía. Por eso este adapter:
 *   - NO hace ninguna llamada HTTP ni se conecta a ningún host de ARCA/AFIP.
 *   - NO usa ni almacena ninguna credencial (Clave Fiscal ni de ningún tipo).
 *   - NO hace scraping del portal de ARCA, ni siquiera "para probar si funciona".
 * Solo loguea la operación solicitada y devuelve una lista vacía — se
 * comporta como "sin novedades nuevas" siempre, lo cual es seguro por
 * defecto (nunca genera una alerta falsa mientras esté en uso este stub).
 *
 * Cuando FOLGAR-040/041 se resuelvan, reemplazar el `useClass` del provider
 * `ARCA_MONITOR_PORT` en `alerta-presentaciones.module.ts` por un adapter
 * real (p. ej. `ArcaClaveFiscalAdapter` o `ArcaApiAdapter`) que implemente
 * este mismo puerto `ArcaMonitorPort`. `AlertaPresentacionesService` y
 * `AlertaPresentacionesController` no deberían requerir cambios.
 * ============================================================================
 */
@Injectable()
export class ArcaMonitorStubAdapter implements ArcaMonitorPort {
  private readonly logger = new Logger(ArcaMonitorStubAdapter.name);

  consultarNovedades(clienteId: string): Promise<NovedadDetectada[]> {
    this.logger.warn(
      `[STUB] consultarNovedades(clienteId=${clienteId}) invocado — todavía no hay integración real ` +
        'con el Domicilio Fiscal Electrónico de ARCA (pendiente FOLGAR-040/041). Devolviendo sin novedades.',
    );

    return Promise.resolve([]);
  }
}
