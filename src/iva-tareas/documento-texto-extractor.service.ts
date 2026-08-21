import { Injectable, Logger } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';

export interface TextoDocumentoExtraido {
  texto: string;
  /** false si no se pudo extraer suficiente texto útil (documento vacío, binario no soportado, PDF escaneado, etc.). */
  legible: boolean;
}

/** Umbral mínimo de caracteres útiles (sin espacios) para considerar que vale la pena mandarle el texto a la IA. */
const MIN_CARACTERES_UTILES = 20;

/**
 * Extrae el texto plano de "Importar tareas desde documento" de forma
 * determinística, sin IA — mismo espíritu que `PdfTextExtractorService` en
 * extractos-ia (duplicado acá en vez de compartido entre módulos, ver nota
 * de convención de `features/<modulo>` en CLAUDE.md del Frontend), pero
 * generalizado a los formatos que acepta este flujo: PDF, DOCX, y cualquier
 * archivo de texto plano (TXT, MD, JSON, CSV, .doc legacy como mejor
 * esfuerzo). Nunca delegarle a la IA el parseo binario — su única
 * responsabilidad es leer el texto ya extraído y proponer tareas.
 */
@Injectable()
export class DocumentoTextoExtractorService {
  private readonly logger = new Logger(DocumentoTextoExtractorService.name);

  async extraer(nombreArchivo: string, contenidoBase64: string): Promise<TextoDocumentoExtraido> {
    if (!contenidoBase64) {
      return { texto: '', legible: false };
    }

    try {
      const buffer = Buffer.from(contenidoBase64, 'base64');
      const extension = this.extension(nombreArchivo);
      const texto =
        extension === '.pdf'
          ? await this.extraerPdf(buffer)
          : extension === '.docx'
            ? await this.extraerDocx(buffer)
            : buffer.toString('utf-8'); // .txt, .md, .json, .csv, .doc legacy (mejor esfuerzo): texto plano.

      const caracteresUtiles = texto.replace(/\s/g, '').length;
      return { texto, legible: caracteresUtiles >= MIN_CARACTERES_UTILES };
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.warn(`No se pudo leer "${nombreArchivo}": ${mensaje}`);
      return { texto: '', legible: false };
    }
  }

  private extension(nombreArchivo: string): string {
    const match = /\.[^.]+$/.exec(nombreArchivo.toLowerCase());
    return match ? match[0] : '';
  }

  private async extraerPdf(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buffer });
    try {
      const resultado = await parser.getText();
      return resultado.text ?? '';
    } finally {
      await parser.destroy();
    }
  }

  private async extraerDocx(buffer: Buffer): Promise<string> {
    const resultado = await mammoth.extractRawText({ buffer });
    return resultado.value ?? '';
  }
}
