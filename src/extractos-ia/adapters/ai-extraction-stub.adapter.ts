import { Injectable, Logger } from '@nestjs/common';
import { AiExtractionPort, ExtraccionResultado } from '../ports/ai-extraction.port';

/**
 * ============================================================================
 *  PLACEHOLDER — NO ES UNA INTEGRACIÓN REAL CONTRA NINGÚN PROVEEDOR DE IA
 * ============================================================================
 * Este adapter existe únicamente para que `ExtractosIaService`, el controller
 * y el flujo de revisión/edición se puedan desarrollar y testear hoy, sin
 * bloquearse en una decisión comercial que todavía no se tomó.
 *
 * Todavía no está confirmado qué proveedor de IA se va a usar (ni OpenAI, ni
 * Anthropic, ni ningún otro). Por eso este adapter NO llama a ningún servicio
 * externo, no usa API keys, y no hace ninguna petición HTTP: solo loguea la
 * operación solicitada (con el Logger de Nest, dejando explícito que es un
 * stub) y devuelve un resultado simulado, determinístico en base al nombre de
 * archivo recibido.
 *
 * Heurística de simulación (solo para poder probar los dos caminos del
 * servicio sin un proveedor real):
 *  - Si `contenidoBase64` viene vacío, o el nombre de archivo sugiere un PDF
 *    escaneado (contiene "escaneado" o "sin-texto", sin distinguir
 *    mayúsculas), se simula el caso de error de FOLGAR-010: "PDF sin capa de
 *    texto, probablemente escaneado".
 *  - En cualquier otro caso, se devuelven movimientos de ejemplo fijos
 *    (mismos valores siempre) para que el flujo completo de carga → revisión
 *    → edición se pueda ejercitar de punta a punta.
 *
 * Cuando se confirme el proveedor, reemplazar el `useClass` del provider
 * `AI_EXTRACTION_PORT` en `extractos-ia.module.ts` por un adapter concreto
 * (p. ej. `OpenAiExtractionAdapter` o `AnthropicExtractionAdapter`) que
 * implemente este mismo puerto `AiExtractionPort`. `ExtractosIaService` y
 * `ExtractosIaController` no deberían requerir cambios.
 * ============================================================================
 */
@Injectable()
export class AiExtractionStubAdapter implements AiExtractionPort {
  private readonly logger = new Logger(AiExtractionStubAdapter.name);

  extraerMovimientos(input: {
    nombreArchivo: string;
    contenidoBase64: string;
  }): Promise<ExtraccionResultado> {
    this.logger.warn(
      `[STUB] extraerMovimientos() invocado con nombreArchivo="${input.nombreArchivo}" — todavía no hay proveedor de IA confirmado (ni OpenAI, ni Anthropic, ni otro)`,
    );

    const pareceEscaneado =
      !input.contenidoBase64 || /escaneado|sin-texto|sin_texto/i.test(input.nombreArchivo);

    if (pareceEscaneado) {
      return Promise.resolve({
        exitoso: false,
        movimientos: [],
        mensaje:
          'PDF sin capa de texto, probablemente escaneado. Simulado por el adapter stub (sin proveedor de IA real todavía).',
      });
    }

    return Promise.resolve({
      exitoso: true,
      mensaje:
        'Simulado: extracción de ejemplo generada por el adapter stub (sin proveedor de IA real todavía).',
      movimientos: [
        { fecha: '2026-08-01', concepto: 'Transferencia recibida', monto: 150000, tipo: 'credito' },
        {
          fecha: '2026-08-03',
          concepto: 'Pago de servicios - Edenor',
          monto: -8500,
          tipo: 'debito',
        },
        {
          fecha: '2026-08-05',
          concepto: 'Pago de servicios - Edenor',
          monto: -6200,
          tipo: 'debito',
        },
        {
          fecha: '2026-08-10',
          concepto: 'Comisión mantenimiento de cuenta',
          monto: -1200,
          tipo: 'debito',
        },
        { fecha: '2026-08-15', concepto: 'Transferencia recibida', monto: 95000, tipo: 'credito' },
      ],
    });
  }
}
