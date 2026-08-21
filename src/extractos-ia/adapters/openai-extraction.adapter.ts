import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod/v4';
import {
  AiExtractionInput,
  AiExtractionPort,
  ExtraccionResultado,
  MovimientoExtraido,
  ReglaClasificacionSugerida,
} from '../ports/ai-extraction.port';
import {
  ExtraccionSchema,
  PROMPT_SISTEMA,
  construirMensajeUsuario,
} from './shared/extraccion.schema';

const MAX_TOKENS_RESPUESTA = 32000;
type ExtraccionParseada = z.infer<typeof ExtraccionSchema>;

/**
 * Adapter alternativo de `AiExtractionPort` usando OpenAI (GPT-5.1 por
 * default, configurable con `OPENAI_MODEL`), con salida estructurada vía
 * `zodResponseFormat` sobre el mismo `ExtraccionSchema`/`PROMPT_SISTEMA` que
 * usa `AnthropicExtractionAdapter` — mismo contrato de entrada/salida, mismo
 * comportamiento esperado, solo cambia el proveedor de IA.
 *
 * Seleccionado vía `AI_PROVIDER=openai` en `extractos-ia.module.ts`.
 */
@Injectable()
export class OpenAiExtractionAdapter implements AiExtractionPort {
  private readonly logger = new Logger(OpenAiExtractionAdapter.name);
  private readonly client: OpenAI;
  private readonly modelo: string;

  constructor(configService: ConfigService) {
    this.client = new OpenAI({ apiKey: configService.get<string>('OPENAI_API_KEY') });
    this.modelo = configService.get<string>('OPENAI_MODEL') ?? 'gpt-5.1';
  }

  async extraerMovimientos(input: AiExtractionInput): Promise<ExtraccionResultado> {
    try {
      const completion = await this.client.chat.completions.parse({
        model: this.modelo,
        max_completion_tokens: MAX_TOKENS_RESPUESTA,
        messages: [
          { role: 'system', content: PROMPT_SISTEMA },
          { role: 'user', content: construirMensajeUsuario(input) },
        ],
        response_format: zodResponseFormat(ExtraccionSchema, 'extraccion'),
      });

      const mensaje = completion.choices[0]?.message;

      if (mensaje?.refusal) {
        return {
          exitoso: false,
          movimientos: [],
          reglasSugeridas: [],
          mensaje: 'El proveedor de IA rechazó procesar este extracto.',
        };
      }

      if (!mensaje?.parsed) {
        return {
          exitoso: false,
          movimientos: [],
          reglasSugeridas: [],
          mensaje: `La IA no devolvió un resultado estructurado válido (finish_reason: ${completion.choices[0]?.finish_reason}).`,
        };
      }

      const resultado = mensaje.parsed as ExtraccionParseada;
      const movimientos: MovimientoExtraido[] = resultado.movimientos.map((m) => ({
        fecha: m.fecha,
        concepto: m.concepto,
        monto: m.monto,
        tipo: m.tipo ?? undefined,
        numeroComprobante: m.numeroComprobante ?? undefined,
        saldoDespues: m.saldoDespues ?? undefined,
      }));
      const reglasSugeridas: ReglaClasificacionSugerida[] = resultado.reglasSugeridas.map((r) => ({
        patronTexto: r.patronTexto,
        cuentaCodigo: r.cuentaCodigo,
        ladoAsiento: r.ladoAsiento,
        tipoMovimiento: r.tipoMovimiento ?? undefined,
      }));

      return {
        exitoso: true,
        movimientos,
        reglasSugeridas,
        saldoInicialDeclarado: resultado.saldoInicialDeclarado ?? undefined,
        saldoFinalDeclarado: resultado.saldoFinalDeclarado ?? undefined,
        mensaje: `Extraídos ${movimientos.length} movimientos con ${this.modelo}.`,
      };
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : 'Error desconocido al llamar al proveedor de IA';
      this.logger.error(`Falló la extracción con OpenAI para "${input.nombreArchivo}": ${mensaje}`);
      return { exitoso: false, movimientos: [], reglasSugeridas: [], mensaje };
    }
  }
}
