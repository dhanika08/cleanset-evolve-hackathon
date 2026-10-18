import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/**
 * Extracts raw text from a PDF Buffer or base64 data URI.
 * Uses pdf-parse to extract readable text content.
 */
export async function extractTextFromPdfBase64(base64Data: string): Promise<string> {
  if (!base64Data) return '';
  try {
    const { PDFParse } = require('pdf-parse');
    const pureBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(pureBase64, 'base64');
    
    const parser = new PDFParse({ data: buffer });
    await parser.load();
    const result = await parser.getText();
    await parser.destroy();
    
    return (result?.text || '').trim();
  } catch (err: any) {
    console.warn('[PDF Text Extractor] Could not extract text from PDF buffer:', err?.message || err);
    return '';
  }
}
