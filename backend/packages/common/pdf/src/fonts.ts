import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PDFDocument, PDFFont } from 'pdf-lib';

const FONTS_DIR = resolve(import.meta.dirname, 'fonts');

export interface HmsFonts {
  regular: PDFFont;
  bold: PDFFont;
}

/**
 * Loads and embeds GoogleSans fonts into a PDFDocument.
 *
 * Place your font files in src/fonts/:
 *   - GoogleSans-Regular.ttf
 *   - GoogleSans-Bold.ttf
 */
export async function embedFonts(doc: PDFDocument): Promise<HmsFonts> {
  const [regularBytes, boldBytes] = await Promise.all([
    readFile(resolve(FONTS_DIR, 'GoogleSans-Regular.ttf')),
    readFile(resolve(FONTS_DIR, 'GoogleSans-Bold.ttf')),
  ]);

  const [regular, bold] = await Promise.all([
    doc.embedFont(regularBytes),
    doc.embedFont(boldBytes),
  ]);

  return { regular, bold };
}
