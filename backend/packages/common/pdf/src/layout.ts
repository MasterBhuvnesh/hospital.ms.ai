import { PDFPage, PDFFont, RGB, rgb } from 'pdf-lib';
import { colors } from './colors.js';

/** Standard A4 dimensions in points (72 points = 1 inch) */
export const A4 = { width: 595.28, height: 841.89 } as const;

/** Default page margins */
export const MARGINS = { top: 50, right: 50, bottom: 60, left: 50 } as const;

/** Content width inside margins */
export const CONTENT_WIDTH = A4.width - MARGINS.left - MARGINS.right;

// ── Text Drawing Helpers ────────────────────────────

export interface TextOptions {
  font: PDFFont;
  size?: number;
  color?: RGB;
  maxWidth?: number;
}

/** Draw text at (x, y) and return the new Y position below it */
export function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  opts: TextOptions,
): number {
  const size = opts.size ?? 10;
  const color = opts.color ?? colors.darkGray;

  page.drawText(text, { x, y, size, font: opts.font, color });
  return y - size - 4;
}

/** Draw a line of text right-aligned within the content area */
export function drawTextRight(
  page: PDFPage,
  text: string,
  y: number,
  opts: TextOptions,
): number {
  const size = opts.size ?? 10;
  const width = opts.font.widthOfTextAtSize(text, size);
  const x = A4.width - MARGINS.right - width;
  return drawText(page, text, x, y, opts);
}

/** Draw a key-value pair: "Label: Value" */
export function drawKeyValue(
  page: PDFPage,
  label: string,
  value: string,
  x: number,
  y: number,
  boldFont: PDFFont,
  regularFont: PDFFont,
  size: number = 10,
): number {
  const labelWidth = boldFont.widthOfTextAtSize(`${label}: `, size);

  page.drawText(`${label}: `, {
    x,
    y,
    size,
    font: boldFont,
    color: colors.darkGray,
  });

  page.drawText(value, {
    x: x + labelWidth,
    y,
    size,
    font: regularFont,
    color: colors.gray,
  });

  return y - size - 6;
}

// ── Line / Divider ──────────────────────────────────

/** Draw a horizontal divider line */
export function drawDivider(
  page: PDFPage,
  y: number,
  color: RGB = colors.lightGray,
  thickness: number = 0.5,
): number {
  page.drawLine({
    start: { x: MARGINS.left, y },
    end: { x: A4.width - MARGINS.right, y },
    thickness,
    color,
  });
  return y - 10;
}

// ── Table Drawing ───────────────────────────────────

export interface TableColumn {
  header: string;
  width: number;
  align?: 'left' | 'right' | 'center';
}

export interface TableOptions {
  columns: TableColumn[];
  rows: string[][];
  boldFont: PDFFont;
  regularFont: PDFFont;
  fontSize?: number;
  headerBg?: RGB;
  headerColor?: RGB;
  rowHeight?: number;
}

/**
 * Draw a table and return the Y position below the last row.
 * Handles header row styling and alternating row backgrounds.
 */
export function drawTable(
  page: PDFPage,
  x: number,
  y: number,
  opts: TableOptions,
): number {
  const fontSize = opts.fontSize ?? 9;
  const rowHeight = opts.rowHeight ?? 22;
  const headerBg = opts.headerBg ?? colors.tableHeader;
  const headerColor = opts.headerColor ?? colors.primaryDark;

  // ── Header row ──
  page.drawRectangle({
    x,
    y: y - rowHeight,
    width: CONTENT_WIDTH,
    height: rowHeight,
    color: headerBg,
  });

  let colX = x;
  for (const col of opts.columns) {
    const textX = col.align === 'right'
      ? colX + col.width - opts.boldFont.widthOfTextAtSize(col.header, fontSize) - 4
      : colX + 4;

    page.drawText(col.header, {
      x: textX,
      y: y - rowHeight + 6,
      size: fontSize,
      font: opts.boldFont,
      color: headerColor,
    });
    colX += col.width;
  }

  let currentY = y - rowHeight;

  // ── Data rows ──
  for (let rowIdx = 0; rowIdx < opts.rows.length; rowIdx++) {
    const row = opts.rows[rowIdx];

    // Alternating row background
    if (rowIdx % 2 === 1) {
      page.drawRectangle({
        x,
        y: currentY - rowHeight,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: rgb(0.97, 0.97, 0.97),
      });
    }

    colX = x;
    for (let colIdx = 0; colIdx < opts.columns.length; colIdx++) {
      const col = opts.columns[colIdx];
      const cellText = row[colIdx] ?? '';
      const textWidth = opts.regularFont.widthOfTextAtSize(cellText, fontSize);
      const textX = col.align === 'right'
        ? colX + col.width - textWidth - 4
        : colX + 4;

      page.drawText(cellText, {
        x: textX,
        y: currentY - rowHeight + 6,
        size: fontSize,
        font: opts.regularFont,
        color: colors.darkGray,
      });
      colX += col.width;
    }

    currentY -= rowHeight;
  }

  // Bottom border
  page.drawLine({
    start: { x, y: currentY },
    end: { x: x + CONTENT_WIDTH, y: currentY },
    thickness: 0.5,
    color: colors.tableBorder,
  });

  return currentY - 10;
}

// ── Section Header ──────────────────────────────────

/** Draw a section title (bold, colored) with a divider below */
export function drawSectionHeader(
  page: PDFPage,
  title: string,
  y: number,
  boldFont: PDFFont,
  size: number = 12,
): number {
  page.drawText(title, {
    x: MARGINS.left,
    y,
    size,
    font: boldFont,
    color: colors.primary,
  });
  return drawDivider(page, y - 4, colors.primary, 1);
}
