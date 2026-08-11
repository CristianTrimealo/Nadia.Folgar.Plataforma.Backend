/**
 * Puerto de monitoreo del Domicilio Fiscal Electrónico en ARCA (ex-AFIP)
 * (patrón puerto/adapter — ver ADR #5 en CLAUDE.md: "Puerto/adapter para
 * toda integración externa"; mismo criterio que `CatedralSyncPort`).
 *
 * ARCA notifica novedades a cada contribuyente en su Domicilio Fiscal
 * Electrónico. Al día de hoy (FOLGAR-040/041) todavía NO está decidido cómo
 * el estudio va a acceder a ese domicilio de forma automatizada por
 * cliente — ¿delegación de Clave Fiscal? ¿alguna API oficial de ARCA? no se
 * sabe, y es una conversación pendiente con el cliente. Por eso este
 * contrato se mantiene deliberadamente mínimo: modela únicamente la
 * operación que el resto del sistema necesita (consultar novedades de un
 * cliente puntual), sin comprometerse a ninguna vía de acceso concreta.
 *
 * `AlertaPresentacionesService` depende únicamente de esta interfaz,
 * inyectada vía el token `ARCA_MONITOR_PORT` (nunca de una clase concreta).
 * El día de mañana se puede escribir un adapter real (ej.
 * `ArcaClaveFiscalAdapter` o `ArcaApiAdapter`) que implemente este mismo
 * puerto sin tocar el resto del sistema — alcanza con cambiar el `useClass`
 * del provider en `alerta-presentaciones.module.ts`.
 */
export interface NovedadDetectada {
  /**
   * Identificador estable de la novedad, tal como la expone la vía de
   * acceso elegida (ej. un id de notificación de ARCA, un hash del
   * contenido, etc.). Se usa para deduplicar: si ya existe una
   * `NovedadFiscal` con esta misma referencia para el cliente, no se genera
   * una alerta duplicada. El adapter stub la genera como puede (ver
   * `ArcaMonitorStubAdapter`) porque todavía no hay una fuente real de la
   * que derivarla.
   */
  referenciaExterna: string;
  /** Descripción legible de la novedad (texto de la notificación de ARCA, o equivalente). */
  descripcion: string;
  /** Fecha en la que ARCA generó/publicó la novedad. */
  fecha: Date;
}

export interface ArcaMonitorPort {
  /** Consulta las novedades del Domicilio Fiscal Electrónico de un cliente puntual. */
  consultarNovedades(clienteId: string): Promise<NovedadDetectada[]>;
}

/**
 * Token de inyección de dependencias para `ArcaMonitorPort`. Se inyecta con
 * `@Inject(ARCA_MONITOR_PORT)` en vez de acoplarse a un adapter concreto.
 */
export const ARCA_MONITOR_PORT = Symbol('ARCA_MONITOR_PORT');
