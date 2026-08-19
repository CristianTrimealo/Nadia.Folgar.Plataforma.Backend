import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Job } from 'bullmq';
import { ExtractosIaProcessor, ProcesarExtractoJobData } from './extractos-ia.processor';
import { AI_EXTRACTION_PORT } from './ports/ai-extraction.port';
import {
  EstadoExtracto,
  ExtractoBancario,
  ValidacionSaldo,
} from './schemas/extracto-bancario.schema';
import { PdfTextExtractorService } from './pdf-text-extractor.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

describe('ExtractosIaProcessor', () => {
  let processor: ExtractosIaProcessor;
  const estudioId = new Types.ObjectId().toString();
  const extractoId = new Types.ObjectId().toString();

  const extractoModelMock: any = { findById: jest.fn() };

  // Fake que implementa AiExtractionPort — reemplaza al adapter real (stub,
  // Anthropic u OpenAI) para probar el worker sin depender de ninguno.
  const fakePort: any = { extraerMovimientos: jest.fn() };
  const pdfTextExtractorMock = { extraer: jest.fn() };
  const realtimeGatewayMock = { emitToEstudio: jest.fn() };

  function buildExtractoInstance(overrides: Record<string, unknown> = {}): any {
    const instance: any = {
      _id: extractoId,
      nombreArchivo: 'extracto.pdf',
      estado: EstadoExtracto.PROCESANDO,
      movimientos: [],
      saldoInicialDeclarado: undefined,
      saldoFinalDeclarado: undefined,
      mensajeError: undefined,
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
    return instance;
  }

  function buildJob(
    overrides: Partial<ProcesarExtractoJobData> = {},
  ): Job<ProcesarExtractoJobData> {
    return {
      data: {
        extractoId,
        estudioId,
        nombreArchivo: 'extracto.pdf',
        contenidoBase64: 'QQ==',
        ...overrides,
      },
    } as Job<ProcesarExtractoJobData>;
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ExtractosIaProcessor,
        { provide: AI_EXTRACTION_PORT, useValue: fakePort },
        { provide: getModelToken(ExtractoBancario.name), useValue: extractoModelMock },
        { provide: PdfTextExtractorService, useValue: pdfTextExtractorMock },
        { provide: RealtimeGateway, useValue: realtimeGatewayMock },
      ],
    }).compile();

    processor = moduleRef.get(ExtractosIaProcessor);
  });

  it('descarta el job sin fallar si el extracto ya no existe (ej. borrado mientras esperaba en cola)', async () => {
    extractoModelMock.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await processor.process(buildJob());

    expect(fakePort.extraerMovimientos).not.toHaveBeenCalled();
    expect(realtimeGatewayMock.emitToEstudio).not.toHaveBeenCalled();
  });

  it('procesa y notifica "procesado" cuando no hay saldo para validar', async () => {
    const instance = buildExtractoInstance();
    extractoModelMock.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(instance) });
    pdfTextExtractorMock.extraer.mockResolvedValue({
      texto: 'texto del pdf',
      tieneCapaDeTexto: true,
    });
    fakePort.extraerMovimientos.mockResolvedValue({
      exitoso: true,
      movimientos: [
        { fecha: '2026-07-01', concepto: 'Transferencia recibida', monto: 1000, tipo: 'credito' },
      ],
      mensaje: 'ok',
    });

    await processor.process(buildJob());

    expect(pdfTextExtractorMock.extraer).toHaveBeenCalledWith('QQ==');
    expect(fakePort.extraerMovimientos).toHaveBeenCalledTimes(1);
    expect(instance.estado).toBe(EstadoExtracto.PROCESADO);
    expect(instance.movimientos).toHaveLength(1);
    expect(instance.movimientos[0].validacionSaldo).toBe(ValidacionSaldo.NO_APLICA);
    expect(instance.save).toHaveBeenCalledTimes(1);
    expect(realtimeGatewayMock.emitToEstudio).toHaveBeenCalledWith(
      estudioId,
      'extracto:procesado',
      {
        extractoId,
        estado: EstadoExtracto.PROCESADO,
        nombreArchivo: 'extracto.pdf',
      },
    );
  });

  it('no llama a la IA y notifica "error" si el PDF no tiene capa de texto', async () => {
    const instance = buildExtractoInstance();
    extractoModelMock.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(instance) });
    pdfTextExtractorMock.extraer.mockResolvedValue({ texto: '', tieneCapaDeTexto: false });

    await processor.process(buildJob());

    expect(fakePort.extraerMovimientos).not.toHaveBeenCalled();
    expect(instance.estado).toBe(EstadoExtracto.ERROR);
    expect(instance.mensajeError).toMatch(/sin capa de texto/i);
    expect(realtimeGatewayMock.emitToEstudio).toHaveBeenCalledWith(
      estudioId,
      'extracto:procesado',
      {
        extractoId,
        estado: EstadoExtracto.ERROR,
        nombreArchivo: 'extracto.pdf',
      },
    );
  });

  it('queda en estado "error" cuando el puerto responde no exitoso', async () => {
    const instance = buildExtractoInstance();
    extractoModelMock.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(instance) });
    pdfTextExtractorMock.extraer.mockResolvedValue({ texto: 'texto', tieneCapaDeTexto: true });
    fakePort.extraerMovimientos.mockResolvedValue({
      exitoso: false,
      movimientos: [],
      mensaje: 'No se pudo estructurar el extracto',
    });

    await processor.process(buildJob());

    expect(instance.estado).toBe(EstadoExtracto.ERROR);
    expect(instance.mensajeError).toBe('No se pudo estructurar el extracto');
  });

  it('queda en estado "error" si el puerto lanza una excepción', async () => {
    const instance = buildExtractoInstance();
    extractoModelMock.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(instance) });
    pdfTextExtractorMock.extraer.mockResolvedValue({ texto: 'texto', tieneCapaDeTexto: true });
    fakePort.extraerMovimientos.mockRejectedValue(new Error('timeout del proveedor de IA'));

    await processor.process(buildJob());

    expect(instance.estado).toBe(EstadoExtracto.ERROR);
    expect(instance.mensajeError).toBe('timeout del proveedor de IA');
  });

  describe('validación de saldo — datos reales del extracto Santander de Interprints (julio 2024)', () => {
    it('marca "ok" cuando el saldo declarado por fila coincide con el calculado', async () => {
      const instance = buildExtractoInstance();
      extractoModelMock.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(instance) });
      pdfTextExtractorMock.extraer.mockResolvedValue({ texto: 'texto', tieneCapaDeTexto: true });
      fakePort.extraerMovimientos.mockResolvedValue({
        exitoso: true,
        saldoInicialDeclarado: 47670.26,
        saldoFinalDeclarado: 507547.36,
        movimientos: [
          {
            fecha: '01/07/24',
            concepto: 'Pago comercios frst data master nro.liq. 00210181/0015956286',
            monto: 79479.41,
            tipo: 'credito',
            saldoDespues: 127149.67,
          },
          {
            fecha: '01/07/24',
            concepto: 'Pago comercios frst data visa nro.liq. 00209717/0015956286',
            monto: 430697.69,
            tipo: 'credito',
            saldoDespues: 557847.36,
          },
          {
            fecha: '01/07/24',
            concepto: 'Pago de haberes 00720055007000356523ars',
            monto: 50000.0,
            tipo: 'debito',
            saldoDespues: 507847.36,
          },
          {
            fecha: '01/07/24',
            concepto: 'Impuesto ley 25.413 debito 0,6%',
            monto: 300.0,
            tipo: 'debito',
            saldoDespues: 507547.36,
          },
        ],
      });

      await processor.process(buildJob());

      expect(instance.movimientos.every((m: any) => m.validacionSaldo === ValidacionSaldo.OK)).toBe(
        true,
      );
      expect(instance.estado).toBe(EstadoExtracto.PROCESADO);
    });

    it('detecta una diferencia real y reintenta antes de resignarse a REQUIERE_REVISION', async () => {
      const instance = buildExtractoInstance();
      extractoModelMock.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(instance) });
      pdfTextExtractorMock.extraer.mockResolvedValue({ texto: 'texto', tieneCapaDeTexto: true });

      const primerIntento = {
        exitoso: true,
        saldoInicialDeclarado: 1000,
        saldoFinalDeclarado: 1200,
        movimientos: [
          {
            fecha: '01/01/26',
            concepto: 'Transferencia',
            monto: 100,
            tipo: 'credito',
            saldoDespues: 1200,
          },
        ],
      };

      fakePort.extraerMovimientos.mockResolvedValueOnce(primerIntento);
      fakePort.extraerMovimientos.mockResolvedValueOnce(primerIntento);

      await processor.process(buildJob());

      expect(fakePort.extraerMovimientos).toHaveBeenCalledTimes(2);
      const [, segundaLlamada] = fakePort.extraerMovimientos.mock.calls;
      expect(segundaLlamada[0].pistaRevision).toContain('100');
      expect(instance.estado).toBe(EstadoExtracto.REQUIERE_REVISION);
      expect(instance.movimientos[0].validacionSaldo).toBe(ValidacionSaldo.DIFERENCIA);
    });

    it('si el reintento corrige el monto, el extracto queda "procesado" con los datos corregidos', async () => {
      const instance = buildExtractoInstance();
      extractoModelMock.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(instance) });
      pdfTextExtractorMock.extraer.mockResolvedValue({ texto: 'texto', tieneCapaDeTexto: true });

      fakePort.extraerMovimientos.mockResolvedValueOnce({
        exitoso: true,
        saldoInicialDeclarado: 1000,
        saldoFinalDeclarado: 1200,
        movimientos: [
          {
            fecha: '01/01/26',
            concepto: 'Transferencia',
            monto: 100,
            tipo: 'credito',
            saldoDespues: 1200,
          },
        ],
      });
      fakePort.extraerMovimientos.mockResolvedValueOnce({
        exitoso: true,
        saldoInicialDeclarado: 1000,
        saldoFinalDeclarado: 1200,
        movimientos: [
          {
            fecha: '01/01/26',
            concepto: 'Transferencia',
            monto: 200,
            tipo: 'credito',
            saldoDespues: 1200,
          },
        ],
      });

      await processor.process(buildJob());

      expect(instance.estado).toBe(EstadoExtracto.PROCESADO);
      expect(instance.movimientos[0].monto).toBe(200);
      expect(instance.movimientos[0].validacionSaldo).toBe(ValidacionSaldo.OK);
    });
  });
});
