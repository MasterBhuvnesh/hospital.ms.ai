import { PDFDocument, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { embedFonts, HmsFonts } from './fonts.js';
import {
  A4,
  MARGINS,
  CONTENT_WIDTH,
  drawText,
  drawTextRight,
  drawDivider,
} from './layout.js';
import { colors } from './colors.js';

export interface DocumentMeta {
  title: string;
  subject?: string;
  author?: string;
}

export interface HeaderConfig {
  hospitalName: string;
  hospitalAddress?: string;
  hospitalPhone?: string;
  logoText?: string;
}

export interface FooterConfig {
  text?: string;
  showPageNumbers?: boolean;
  showGeneratedAt?: boolean;
}

export interface PdfContext {
  doc: PDFDocument;
  fonts: HmsFonts;
  header?: HeaderConfig;
  footer?: FooterConfig;
}

/**
 * Create a new HMS PDF document with fonts loaded and metadata set.
 */
export async function createDocument(meta: DocumentMeta): Promise<PdfContext> {
  const doc = await PDFDocument.create();

  doc.registerFontkit(fontkit);

  doc.setTitle(meta.title);
  if (meta.subject) doc.setSubject(meta.subject);
  doc.setAuthor(meta.author ?? 'Atelier Health HMS');
  doc.setCreator('HMS PDF Generator');
  doc.setProducer('pdf-lib');

  const fonts = await embedFonts(doc);

  return { doc, fonts };
}

/**
 * Add a new A4 page and draw the standard header/footer.
 * Returns the page and the starting Y position for content.
 */
export function addPage(ctx: PdfContext): { page: PDFPage; y: number } {
  const page = ctx.doc.addPage([A4.width, A4.height]);
  let y = A4.height - MARGINS.top;

  // ── Header ──
  if (ctx.header) {
    const { hospitalName, hospitalAddress, hospitalPhone, logoText } = ctx.header;

    // Logo placeholder (colored box with initials)
    if (logoText) {
      page.drawRectangle({
        x: MARGINS.left,
        y: y - 28,
        width: 32,
        height: 32,
        color: colors.primary,
      });
      page.drawText(logoText, {
        x: MARGINS.left + 6,
        y: y - 22,
        size: 16,
        font: ctx.fonts.bold,
        color: colors.white,
      });
    }

    const nameX = logoText ? MARGINS.left + 40 : MARGINS.left;

    page.drawText(hospitalName, {
      x: nameX,
      y,
      size: 16,
      font: ctx.fonts.bold,
      color: colors.primary,
    });

    if (hospitalAddress) {
      page.drawText(hospitalAddress, {
        x: nameX,
        y: y - 16,
        size: 8,
        font: ctx.fonts.regular,
        color: colors.gray,
      });
    }

    if (hospitalPhone) {
      page.drawText(hospitalPhone, {
        x: nameX,
        y: y - 26,
        size: 8,
        font: ctx.fonts.regular,
        color: colors.gray,
      });
    }

    y -= 40;
    y = drawDivider(page, y, colors.primary, 1.5);
  }

  // ── Footer (drawn at bottom) ──
  if (ctx.footer) {
    const footerY = MARGINS.bottom - 20;

    drawDivider(page, MARGINS.bottom, colors.lightGray, 0.5);

    if (ctx.footer.showGeneratedAt !== false) {
      const timestamp = new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      drawText(page, `Generated: ${timestamp}`, MARGINS.left, footerY, {
        font: ctx.fonts.regular,
        size: 7,
        color: colors.lightGray,
      });
    }

    if (ctx.footer.text) {
      const textWidth = ctx.fonts.regular.widthOfTextAtSize(ctx.footer.text, 7);
      const centerX = (A4.width - textWidth) / 2;
      drawText(page, ctx.footer.text, centerX, footerY, {
        font: ctx.fonts.regular,
        size: 7,
        color: colors.lightGray,
      });
    }

    if (ctx.footer.showPageNumbers !== false) {
      const pageCount = ctx.doc.getPageCount();
      const pageText = `Page ${pageCount}`;
      drawTextRight(page, pageText, footerY, {
        font: ctx.fonts.regular,
        size: 7,
        color: colors.lightGray,
      });
    }
  }

  return { page, y };
}

/**
 * Finalize the document and return the PDF as a Uint8Array.
 */
export async function renderToBuffer(ctx: PdfContext): Promise<Uint8Array> {
  return ctx.doc.save();
}

/**
 * Convenience: check if content will overflow the page.
 * Returns true if y is below the safe bottom margin.
 */
export function needsNewPage(y: number): boolean {
  return y < MARGINS.bottom + 20;
}
