/**
 * Plantillas de aviso. No hace falta un motor de templates (Handlebars, etc.)
 * para el alcance actual — cada plantilla es una función pura que interpola
 * sus parámetros con template literals y devuelve asunto + cuerpo.
 */

/** Identificadores de plantilla disponibles — referenciados desde ReglaNotificacion.plantilla. */
export enum PlantillaNotificacion {
  VENCIMIENTO_PROXIMO = 'vencimiento_proximo',
  RECORDATORIO_HONORARIOS = 'recordatorio_honorarios',
  VENCIMIENTO_IMPOSITIVO = 'vencimiento_impositivo',
}

export interface NotificacionTemplate {
  asunto: string;
  cuerpo: string;
}

/** Aviso genérico de un vencimiento próximo (ej. ARBA, IVA, cualquier tipo). */
export function vencimientoProximoTemplate(params: {
  clienteNombre: string;
  tipo: string;
  fecha: string;
}): NotificacionTemplate {
  return {
    asunto: `Vencimiento próximo: ${params.tipo}`,
    cuerpo:
      `Hola ${params.clienteNombre}, te recordamos que tenés un vencimiento de ${params.tipo} ` +
      `el día ${params.fecha}. Por favor, tomá las previsiones necesarias.`,
  };
}

/** Recordatorio de honorarios impagos (ej. día 3 y día 10 desde el vencimiento). */
export function recordatorioHonorariosTemplate(params: {
  clienteNombre: string;
  diasVencido: number;
}): NotificacionTemplate {
  return {
    asunto: 'Recordatorio de honorarios pendientes',
    cuerpo:
      `Hola ${params.clienteNombre}, te recordamos que tenés honorarios pendientes de pago ` +
      `hace ${params.diasVencido} día(s). Ante cualquier consulta, escribinos.`,
  };
}

/** Aviso de anticipación para un vencimiento impositivo (ej. "X días antes"). */
export function vencimientoImpositivoTemplate(params: {
  clienteNombre: string;
  tipo: string;
  fecha: string;
  diasRestantes: number;
}): NotificacionTemplate {
  return {
    asunto: `Vencimiento de ${params.tipo} en ${params.diasRestantes} día(s)`,
    cuerpo:
      `Hola ${params.clienteNombre}, te recordamos que el vencimiento de ${params.tipo} es ` +
      `el ${params.fecha} (en ${params.diasRestantes} día(s)). Contactanos si necesitás ayuda ` +
      `con la presentación.`,
  };
}
