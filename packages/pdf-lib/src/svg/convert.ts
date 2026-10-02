/**
 * SVG → pdf-lib conversion entry point.
 *
 * Parses the markup, sets up the page coordinate system and drives the element
 * tree. Everything below this point emits pdf-lib operators directly.
 */

import type PDFPage from '../api/PDFPage.js';
import { Renderer } from './renderer.js';
import { parseXml, StringParser, type SvgNode } from './xml.js';
import { parseStyleSheet } from './style.js';
import { Conversion, createElement, type ConvertOptions } from './elements.js';

/** Collect the `<style>` rules of a document. */
function collectStyleRules(root: SvgNode): string {
  const styleElements = root.getElementsByTagName('style');
  let css = '';
  for (const element of styleElements) {
    css += element.textContent;
    css += '\n';
  }
  return css;
}

/** Length factors in PDF points, for a unitless value read off the root. */
const UNIT_FACTORS: Record<string, number> = {
  '': 1,
  pt: 1,
  pc: 12,
  in: 72,
  cm: 72 / 2.54,
  mm: 72 / 25.4,
};

/**
 * Read a length off the root `<svg>`, in PDF points.
 *
 * A unitless value is taken in points, matching how `PDFPage.drawSvg` has
 * always treated the `width`/`height` attributes. Falls back to the page size.
 */
function rootLengthPt(raw: string | null, fallbackPt: number): number {
  if (!raw) return fallbackPt;
  const parser = new StringParser(raw.trim());
  const num = parser.matchNumber();
  const unit = parser.matchLengthUnit();
  if (typeof num !== 'string' || typeof unit !== 'string') return fallbackPt;
  if (unit === '%') return (parseFloat(num) / 100) * fallbackPt;
  const factor = UNIT_FACTORS[unit];
  if (factor === undefined) return fallbackPt;
  const value = parseFloat(num) * factor;
  return Number.isFinite(value) ? value : fallbackPt;
}

/**
 * Draw an SVG document onto a pdf-lib page.
 *
 * @param page    The page to draw on.
 * @param svg     The SVG markup.
 * @param x       Left edge of the drawing area, in PDF units.
 * @param y       Vertical position of the drawing area, in PDF units. This is
 *                the bottom edge unless `options.anchorY` is `"top"`.
 * @param options Conversion options.
 */
export function drawSvgToPage(
  page: PDFPage,
  svg: string,
  x: number,
  y: number,
  options: ConvertOptions = {},
): void {
  const warningCallback =
    options.warningCallback ??
    ((message: string) => {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn(message);
      }
    });

  const renderer = new Renderer(page, {
    fontCallback: options.fontCallback as never,
    imageCallback: options.imageCallback,
    warningCallback,
  });
  const conversion = new Conversion(renderer, options);

  const root = parseXml(svg, warningCallback);
  if (!root) {
    warningCallback('svg4pdf-lib: could not parse the SVG document');
    return;
  }
  conversion.root = root;

  const pointsPerInch = options.pointsPerInch || 72;
  const pxToPt = options.assumePt ? 72 / pointsPerInch : pointsPerInch / 96;
  conversion.pxToPt = pxToPt;

  const { width: pageWidth, height: pageHeight } = page.getSize();
  // `width`/`height` options are in points; without them the SVG keeps its
  // own intrinsic size, and the page size is the last resort.
  const widthPt = options.width ?? rootLengthPt(root.getAttribute('width'), pageWidth);
  const heightPt = options.height ?? rootLengthPt(root.getAttribute('height'), pageHeight);
  conversion.viewportWidth = widthPt / pxToPt;
  conversion.viewportHeight = heightPt / pxToPt;
  conversion.preserveAspectRatio = options.preserveAspectRatio ?? null;

  conversion.rules.push(...parseStyleSheet(collectStyleRules(root)));

  // SVG's Y axis points down, PDF's points up: flip, and place the drawing
  // area at (x, y). `anchorY` selects whether y is the bottom edge (the
  // default here) or the top edge of the drawing area; `PDFPage.drawSvg`
  // uses the top edge convention.
  const topOffset = options.anchorY === 'top' ? 0 : conversion.viewportHeight * pxToPt;
  renderer.save();
  renderer.translate(x, y + topOffset);
  renderer.transform([pxToPt, 0, 0, -pxToPt, 0, 0]);

  const element = createElement(root, null, conversion);
  element.drawInDocument(false, false);

  renderer.restore();
  renderer.flush();
}

export type { ConvertOptions };
