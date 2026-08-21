import { Injectable, Logger } from '@nestjs/common';
import {
  AiTareasDocumentoInput,
  AiTareasDocumentoPort,
  AnalisisTareasResultado,
} from '../ports/ai-tareas-documento.port';

/**
 * ============================================================================
 *  PLACEHOLDER — NO ES UNA INTEGRACIÓN REAL CONTRA NINGÚN PROVEEDOR DE IA
 * ============================================================================
 * Selectable vía `AI_PROVIDER=stub` (default en desarrollo/tests, ver
 * `iva-tareas.module.ts`) — no llama a ningún servicio externo, no usa API
 * keys: solo loguea la operación (con el Logger de Nest, dejando explícito
 * que es un stub) y devuelve una lista de tareas de ejemplo fija, para poder
 * ejercitar el flujo completo (subir → analizar → revisar → importar →
 * tarjetas en "Pendiente") sin depender de una API key real. Mismo criterio
 * que `AiExtractionStubAdapter` en extractos-ia.
 *
 * Convención SOLO para este stub: si el nombre de archivo contiene "error"
 * (sin distinguir mayúsculas), simula que la IA no pudo leer el documento —
 * para poder probar el camino de error sin un proveedor real.
 * ============================================================================
 */
@Injectable()
export class AiTareasDocumentoStubAdapter implements AiTareasDocumentoPort {
  private readonly logger = new Logger(AiTareasDocumentoStubAdapter.name);

  analizarDocumento(input: AiTareasDocumentoInput): Promise<AnalisisTareasResultado> {
    this.logger.warn(
      `[STUB] analizarDocumento() invocado con nombreArchivo="${input.nombreArchivo}" (AI_PROVIDER=stub)`,
    );

    if (/error/i.test(input.nombreArchivo)) {
      return Promise.resolve({
        exitoso: false,
        tareas: [],
        mensaje: 'No se pudo analizar el documento. Simulado por el adapter stub.',
      });
    }

    return Promise.resolve({
      exitoso: true,
      mensaje: 'Simulado: lista de tareas de ejemplo generada por el adapter stub.',
      tareas: [
        {
          titulo: 'Revisar el documento cargado',
          descripcion:
            'Leer el documento subido y confirmar que el contenido de ejemplo de este adapter stub tiene sentido para tu caso de prueba.',
          checklist: [],
        },
        {
          titulo: 'Configurar un proveedor de IA real',
          descripcion:
            'Este resultado es de ejemplo (AI_PROVIDER=stub). Configurá ANTHROPIC_API_KEY u OPENAI_API_KEY y AI_PROVIDER=anthropic|openai en el .env para que el análisis lea el documento real.',
          checklist: [
            'Conseguir una API key de Anthropic u OpenAI',
            'Cargarla en el .env del Backend',
            'Cambiar AI_PROVIDER a "anthropic" u "openai"',
            'Reiniciar el Backend',
          ],
        },
      ],
    });
  }
}
