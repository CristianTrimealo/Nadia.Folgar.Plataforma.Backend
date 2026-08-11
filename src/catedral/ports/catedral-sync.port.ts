/**
 * Puerto de sincronización con Catedral (patrón puerto/adapter — ver ADR #5 en
 * CLAUDE.md: "Puerto/adapter para toda integración externa").
 *
 * Catedral es el sistema contable/impositivo que el estudio ya usa y no se
 * reemplaza. Al día de hoy (FOLGAR-029) todavía NO está decidido si la
 * integración va a ser por API, por exportación/importación de archivos, o
 * por otra vía — esa decisión depende de una conversación con el cliente que
 * todavía no pasó. Por eso este contrato se mantiene deliberadamente mínimo y
 * genérico: modela las operaciones que probablemente se van a necesitar
 * independientemente de la vía elegida, sin comprometerse a ninguna.
 *
 * `CatedralService` depende únicamente de esta interfaz, inyectada vía el
 * token `CATEDRAL_SYNC_PORT` (nunca de una clase concreta). El día de mañana
 * se puede escribir un `CatedralApiAdapter` o un `CatedralFileAdapter` real
 * que implemente este mismo puerto sin tocar el resto del sistema — alcanza
 * con cambiar el `useClass` del provider en `catedral.module.ts`.
 */
export interface SyncResult {
  /** true si el adapter considera la operación exitosa. */
  exitoso: boolean;
  /** Mensaje legible para humanos — se persiste como `detalle` en CatedralSyncLog. */
  mensaje: string;
  /** Datos adicionales opcionales devueltos por el adapter (conteos, ids, etc.). */
  datos?: Record<string, unknown>;
}

export interface CatedralSyncPort {
  /** Exporta el maestro de clientes del estudio hacia Catedral (o lo que la vía elegida requiera). */
  exportarClientes(): Promise<SyncResult>;

  /**
   * Importa movimientos/datos desde Catedral. `origen` es intencionalmente
   * `unknown`: según la vía que se defina en FOLGAR-029 puede terminar siendo
   * un archivo, una respuesta de API, una ruta a un export, etc. El puerto no
   * prejuzga el formato.
   */
  importarMovimientos(origen: unknown): Promise<SyncResult>;
}

/**
 * Token de inyección de dependencias para `CatedralSyncPort`. Se inyecta con
 * `@Inject(CATEDRAL_SYNC_PORT)` en vez de acoplarse a un adapter concreto.
 */
export const CATEDRAL_SYNC_PORT = Symbol('CATEDRAL_SYNC_PORT');
