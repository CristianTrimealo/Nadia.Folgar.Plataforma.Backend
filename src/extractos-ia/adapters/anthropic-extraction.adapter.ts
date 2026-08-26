import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod/v4';
import {
  AiCredenciales,
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

const MODELO_ANTHROPIC = 'claude-sonnet-5';
const MAX_TOKENS_RESPUESTA = 48000;
type ExtraccionParseada = z.infer<typeof ExtraccionSchema>;

/**
 * Adapter real de `AiExtractionPort` usando Claude Sonnet 5 (Anthropic) con
 * salida estructurada (`output_config.format` + `zodOutputFormat`), sobre el
 * TEXTO ya extraído del PDF (nunca el binario — ver `PdfTextExtractorService`).
 * Schema/prompt compartidos con `OpenAiExtractionAdapter` en
 * `./shared/extraccion.schema.ts` — la tarea es la misma sin importar el
 * proveedor.
 *
 * `thinking: { type: 'disabled' }`: Claude Sonnet 5 piensa por defecto
 * ("adaptive thinking", effort "high") y ese pensamiento consume `max_tokens`
 * — en extractos con muchos movimientos eso alcanzaba a comerse todo el
 * presupuesto antes de terminar de transcribir, cortando con
 * `stop_reason: "max_tokens"` y devolviendo un extracto vacío. Esta tarea es
 * transcripción mecánica pura (el propio prompt dice "no clasificás, no
 * interpretás, no resumís"), no se beneficia de razonar — desactivarlo deja
 * TODO el presupuesto de `max_tokens` para la transcripción real y además
 * reduce el costo (los tokens de pensamiento se facturan igual que los de
 * salida).
 *
 * Se usa `messages.stream()` en vez de `messages.parse()` (no-streaming) para
 * poder pedir un `max_tokens` generoso sin arriesgar el timeout HTTP del SDK
 * en extractos con muchos movimientos — `stream.finalMessage()` igual expone
 * `parsed_output` ya validado contra el schema de Zod.
 *
 * Seleccionado dinámicamente por `ExtractosIaProcessor` vía
 * `AiProviderResolverService` (Configuración → Integraciones) — si la
 * resolución trae una `apiKey` propia (key conectada por el estudio), se usa
 * esa para esta llamada puntual; si no, se cae a la del constructor
 * (`ANTHROPIC_API_KEY` de entorno, comportamiento previo a Configuración).
 */
@Injectable()
export class AnthropicExtractionAdapter implements AiExtractionPort {
  private readonly logger = new Logger(AnthropicExtractionAdapter.name);
  private readonly client: Anthropic;

  constructor(configService: ConfigService) {
    this.client = new Anthropic({ apiKey: configService.get<string>('ANTHROPIC_API_KEY') });
  }

  async extraerMovimientos(
    input: AiExtractionInput,
    credenciales?: AiCredenciales,
  ): Promise<ExtraccionResultado> {
    const client = credenciales?.apiKey
      ? new Anthropic({ apiKey: credenciales.apiKey })
      : this.client;
    const modelo = credenciales?.modelo ?? MODELO_ANTHROPIC;

    try {
      const stream = client.messages.stream({
        model: modelo,
        max_tokens: MAX_TOKENS_RESPUESTA,
        system: PROMPT_SISTEMA,
        messages: [{ role: 'user', content: construirMensajeUsuario(input) }],
        thinking: { type: 'disabled' },
        // `as any`: bajo ts-jest (chequeo de tipos por archivo aislado, a diferencia de
        // `nest build`) esta llamada dispara un TS2589 "type instantiation excessively
        // deep" al comparar el ZodObject de `ExtraccionSchema` contra el genérico interno
        // del helper — inocuo en runtime (la validación real la hace Zod, no TS).
        output_config: { format: zodOutputFormat(ExtraccionSchema as any) },
      });

      const respuesta = await stream.finalMessage();

      if (respuesta.stop_reason === 'refusal') {
        return {
          exitoso: false,
          movimientos: [],
          reglasSugeridas: [],
          mensaje: 'El proveedor de IA rechazó procesar este extracto.',
        };
      }

      if (!respuesta.parsed_output) {
        return {
          exitoso: false,
          movimientos: [],
          reglasSugeridas: [],
          mensaje: `La IA no devolvió un resultado estructurado válido (stop_reason: ${respuesta.stop_reason}).`,
        };
      }

      const resultado = respuesta.parsed_output as ExtraccionParseada;
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
        mensaje: `Extraídos ${movimientos.length} movimientos con Claude Sonnet 5.`,
      };
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : 'Error desconocido al llamar al proveedor de IA';
      this.logger.error(
        `Falló la extracción con Anthropic para "${input.nombreArchivo}": ${mensaje}`,
      );
      return { exitoso: false, movimientos: [], reglasSugeridas: [], mensaje };
    }
  }
}
