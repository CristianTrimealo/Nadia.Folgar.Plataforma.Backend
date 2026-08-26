/**
 * Proveedores de IA soportados para conectar en Configuración → Integraciones
 * (`IntegracionIa.proveedor`), elegir como motor por defecto del estudio
 * (`Estudio.motorIaPorDefecto`) o como preferencia de un cliente
 * (`Cliente.motorIaPreferido`). Vive en `common/` (no dentro de
 * `configuracion/`) porque lo referencian schemas de varios módulos
 * (`tenancy`, `clientes`, `configuracion`) sin que eso implique una
 * dependencia real entre esos módulos — es solo un enum de datos.
 */
export enum ProveedorIA {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
}
