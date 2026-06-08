import { PDFFont, PDFDocument } from '@pdfme/pdf-lib';
import type { Font as FontKitFont } from 'fontkit';
import type { TextSchema } from './types.js';
import {
  PDFRenderProps,
  ColorType,
  Font,
  getDefaultFont,
  getFallbackFontName,
  mm2pt,
} from '@pdfme/common';
import {
  VERTICAL_ALIGN_TOP,
  VERTICAL_ALIGN_MIDDLE,
  VERTICAL_ALIGN_BOTTOM,
  DEFAULT_FONT_SIZE,
  DEFAULT_ALIGNMENT,
  DEFAULT_VERTICAL_ALIGNMENT,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_FONT_COLOR,
} from './constants.js';
import {
  calculateDynamicFontSize,
  heightOfFontAtSize,
  getFontDescentInPt,
  getFontKitFont,
  fetchRemoteFontData,
  widthOfTextAtSize,
  splitTextToSize,
} from './helper.js';
import { stripInlineMarkdown } from './inlineMarkdown.js';
import { applyTextLineRange } from './measure.js';
import { calculateDynamicRichTextFontSize, isInlineMarkdownTextSchema } from './richText.js';
import { renderInlineMarkdownText } from './richTextPdfRender.js';
import { shouldUseDynamicFontSize } from './overflow.js';
import { convertForPdfLayoutProps, rotatePoint, hex2PrintingColor } from '../utils.js';
import { getTextLineRange } from '../splitRange.js';
import { getBoxContentArea, getBoxInsets, hasBoxDimension } from '../box.js';

type PdfFontCache = Record<string, Promise<PDFFont>>;

const PDF_FONT_CACHE_KEY = 'text-pdf-font-cache';

const getPdfFontCache = (_cache: Map<string | number, unknown>): PdfFontCache => {
  let pdfFontCache = _cache.get(PDF_FONT_CACHE_KEY) as PdfFontCache | undefined;
  if (!pdfFontCache) {
    pdfFontCache = {};
    _cache.set(PDF_FONT_CACHE_KEY, pdfFontCache);
  }

  return pdfFontCache;
};

const embedAndGetFont = (arg: {
  pdfDoc: PDFDocument;
  font: Font;
  fontName: string;
  _cache: Map<string | number, unknown>;
}) => {
  const { pdfDoc, font, fontName, _cache } = arg;
  const pdfFontCache = getPdfFontCache(_cache);
  const cachedFont = pdfFontCache[fontName];
  if (cachedFont) {
    return cachedFont;
  }

  const fontValue = font[fontName];
  if (!fontValue) {
    return Promise.reject(new Error(`[@pdfme/schemas] Font "${fontName}" is not found.`));
  }

  const pdfFontPromise = (async () => {
    let fontData = fontValue.data;
    if (typeof fontData === 'string' && fontData.startsWith('http')) {
      fontData = await fetchRemoteFontData(fontData);
    }
    return pdfDoc.embedFont(fontData, {
      subset: typeof fontValue.subset === 'undefined' ? true : fontValue.subset,
    });
  })();

  pdfFontCache[fontName] = pdfFontPromise;
  return pdfFontPromise;
};

const getFontProp = ({
  value,
  fontKitFont,
  schema,
  basePdf,
  colorType,
  fontSize: resolvedFontSize,
}: {
  value: string;
  fontKitFont: FontKitFont;
  colorType?: ColorType;
  schema: TextSchema;
  basePdf: PDFRenderProps<TextSchema>['basePdf'];
  fontSize?: number;
}) => {
  const fontSize =
    resolvedFontSize ??
    (shouldUseDynamicFontSize(schema, basePdf)
      ? calculateDynamicFontSize({ textSchema: schema, fontKitFont, value })
      : (schema.fontSize ?? DEFAULT_FONT_SIZE));
  const color = hex2PrintingColor(schema.fontColor || DEFAULT_FONT_COLOR, colorType);

  return {
    alignment: schema.alignment ?? DEFAULT_ALIGNMENT,
    verticalAlignment: schema.verticalAlignment ?? DEFAULT_VERTICAL_ALIGNMENT,
    lineHeight: schema.lineHeight ?? DEFAULT_LINE_HEIGHT,
    characterSpacing: schema.characterSpacing ?? DEFAULT_CHARACTER_SPACING,
    fontSize,
    color,
  };
};

let graphemeSegmenter: Intl.Segmenter | undefined;

const getGraphemeSegmenter = () => {
  graphemeSegmenter ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  return graphemeSegmenter;
};

// -----------------------------------------------------------------------------
// Helpers for handling mixed‑script text rendering.
//
// The rendering engine in pdf-lib does not correctly position Thai combining
// marks when they appear in the same run as Latin characters. The issue
// manifests when a string like "A วันที่" is passed as a single chunk to
// `page.drawText()`: the Thai tone mark (ไม้เอก) can be dropped because
// OpenType shaping breaks at script boundaries. To work around this, we split
// the text into “script runs” of homogeneous scripts before drawing. See
// https://github.com/pdfme/pdfme/issues/1347 for discussion.

// A run consists of a contiguous sequence of characters from the same script
// (Thai vs. everything else). The `script` property is retained for future
// extensibility even though it is currently unused by the renderer.
type TextScriptRun = {
  text: string;
  script: 'thai' | 'other';
};

// Regular expression to detect Thai script code points using Unicode property
// escapes. Note: Node.js ≥ 16.0.0 supports `\p{Script=Thai}` by default.
const THAI_SCRIPT_RE = /\p{Script=Thai}/u;

// Classify a single grapheme segment as either Thai or other. We treat any
// non‑Thai code point as belonging to the 'other' script. Spaces and
// punctuation are also classified as 'other'.
const getScriptOfSegment = (segment: string): TextScriptRun['script'] => {
  return THAI_SCRIPT_RE.test(segment) ? 'thai' : 'other';
};

/**
 * Break a string into an array of {@link TextScriptRun} where each run
 * contains characters of the same script. Runs are produced in order from
 * left to right. Grapheme segmentation is used so that combining marks are
 * kept with their base characters. Leading spaces and punctuation are
 * preserved on the preceding run to avoid starting a Thai run with a space.
 *
 * @param text The string to segment
 * @returns An array of script runs
 */
const splitTextByScriptRuns = (text: string): TextScriptRun[] => {
  if (!text) return [];

  const segmenter = getGraphemeSegmenter();
  const runs: TextScriptRun[] = [];

  for (const { segment } of segmenter.segment(text)) {
    const script = getScriptOfSegment(segment);
    const prev = runs[runs.length - 1];

    // Keep whitespace and punctuation with the previous run so that Thai runs
    // begin with Thai glyphs and spacing adjustments remain consistent.
    if (!THAI_SCRIPT_RE.test(segment) && segment.trim() === '' && prev) {
      prev.text += segment;
      continue;
    }

    if (!prev || prev.script !== script) {
      runs.push({ text: segment, script });
    } else {
      prev.text += segment;
    }
  }

  return runs;
};

// Helper to calculate extra spacing between runs when character spacing is
// applied. A spacing value is inserted between runs except after the last run.
const getInterRunSpacing = (spacing: number, runIndex: number, runCount: number) => {
  return runIndex < runCount - 1 ? spacing : 0;
};

export const pdfRender = async (arg: PDFRenderProps<TextSchema>) => {
  const { value, pdfDoc, pdfLib, page, options, schema, basePdf, _cache } = arg;
  const { font = getDefaultFont(), colorType } = options;

  const pageHeight = page.getHeight();
  const {
    width,
    height,
    rotate,
    position: { x, y },
    opacity,
  } = convertForPdfLayoutProps({ schema, pageHeight, applyRotateTranslate: false });

  const pivotPoint = { x: x + width / 2, y: pageHeight - mm2pt(schema.position.y) - height / 2 };

  drawTextBoxDecoration({ page, schema, colorType, x, y, width, height, rotate, pivotPoint });
  if (!value) return;

  const fontName = schema.fontName ? schema.fontName : getFallbackFontName(font);
  const enableInlineMarkdown = isInlineMarkdownTextSchema(schema);
  const contentArea = getBoxContentArea(schema);
  const contentX = x + mm2pt(contentArea.leftInset);
  const contentY = y + mm2pt(contentArea.bottomInset);
  const contentWidth = mm2pt(contentArea.width);
  const contentHeight = mm2pt(contentArea.height);

  const pdfFontValuePromise = enableInlineMarkdown
    ? undefined
    : embedAndGetFont({
        pdfDoc,
        font,
        fontName,
        _cache,
      });
  const fontKitFont = await getFontKitFont(
    schema.fontName,
    font,
    _cache as Map<string, FontKitFont>,
  );
  const displayValue = enableInlineMarkdown ? stripInlineMarkdown(value) : value;
  const dynamicRichTextFontSize =
    enableInlineMarkdown && shouldUseDynamicFontSize(schema, basePdf)
      ? await calculateDynamicRichTextFontSize({ value, schema, font, _cache })
      : undefined;
  const fontProp = getFontProp({
    value: displayValue,
    fontKitFont,
    schema,
    basePdf,
    colorType,
    fontSize: dynamicRichTextFontSize,
  });

  const { fontSize, color, alignment, verticalAlignment, lineHeight, characterSpacing } = fontProp;

  if (enableInlineMarkdown) {
    await renderInlineMarkdownText({
      value,
      schema,
      font,
      embedPdfFont: (fontName) => embedAndGetFont({ pdfDoc, font, fontName, _cache }),
      fontKitFont,
      pdfDoc,
      page,
      pdfLib,
      _cache,
      colorType,
      fontSize,
      color,
      alignment,
      verticalAlignment,
      lineHeight,
      characterSpacing,
      x: contentX,
      y: contentY,
      width: contentWidth,
      height: contentHeight,
      pivotPoint,
      rotate,
      opacity,
    });
    return;
  }
  if (!pdfFontValuePromise) {
    throw new Error('[@pdfme/schemas] Failed to prepare PDF font for text rendering.');
  }
  const pdfFontValue = await pdfFontValuePromise;

  const firstLineTextHeight = heightOfFontAtSize(fontKitFont, fontSize);
  const descent = getFontDescentInPt(fontKitFont, fontSize);
  const halfLineHeightAdjustment = lineHeight === 0 ? 0 : ((lineHeight - 1) * fontSize) / 2;

  const lines = applyTextLineRange(
    splitTextToSize({
      value,
      characterSpacing,
      fontSize,
      fontKitFont,
      boxWidthInPt: contentWidth,
    }),
    getTextLineRange(schema),
  );
  const needsTextWidth = alignment !== 'left' || Boolean(schema.strikethrough || schema.underline);
  const needsTextHeight = Boolean(schema.strikethrough || schema.underline);

  // Text lines are rendered from the bottom upwards, we need to adjust the position down
  let yOffset = 0;
  if (verticalAlignment === VERTICAL_ALIGN_TOP) {
    yOffset = firstLineTextHeight + halfLineHeightAdjustment;
  } else {
    const otherLinesHeight = lineHeight * fontSize * (lines.length - 1);

    if (verticalAlignment === VERTICAL_ALIGN_BOTTOM) {
      yOffset = contentHeight - otherLinesHeight + descent - halfLineHeightAdjustment;
    } else if (verticalAlignment === VERTICAL_ALIGN_MIDDLE) {
      yOffset =
        (contentHeight - otherLinesHeight - firstLineTextHeight + descent) / 2 +
        firstLineTextHeight;
    }
  }

  lines.forEach((line, rowIndex) => {
    const trimmed = line.replace('\n', '');
    const textWidth = needsTextWidth
      ? widthOfTextAtSize(trimmed, fontKitFont, fontSize, characterSpacing)
      : 0;
    const textHeight = needsTextHeight ? heightOfFontAtSize(fontKitFont, fontSize) : 0;
    const rowYOffset = lineHeight * fontSize * rowIndex;

    // Adobe Acrobat Reader shows an error if `drawText` is called with an empty text
    if (line === '') {
      // return; // this also works
      line = '\r\n';
    }

    let xLine = contentX;
    if (alignment === 'center') {
      xLine += (contentWidth - textWidth) / 2;
    } else if (alignment === 'right') {
      xLine += contentWidth - textWidth;
    }

    let yLine = contentY + contentHeight - yOffset - rowYOffset;

    // draw strikethrough
    if (schema.strikethrough && textWidth > 0) {
      const _x = xLine + textWidth + 1;
      const _y = yLine + textHeight / 3;
      page.drawLine({
        start: rotatePoint({ x: xLine, y: _y }, pivotPoint, rotate.angle),
        end: rotatePoint({ x: _x, y: _y }, pivotPoint, rotate.angle),
        thickness: (1 / 12) * fontSize,
        color: color,
        opacity,
      });
    }

    // draw underline
    if (schema.underline && textWidth > 0) {
      const _x = xLine + textWidth + 1;
      const _y = yLine - textHeight / 12;
      page.drawLine({
        start: rotatePoint({ x: xLine, y: _y }, pivotPoint, rotate.angle),
        end: rotatePoint({ x: _x, y: _y }, pivotPoint, rotate.angle),
        thickness: (1 / 12) * fontSize,
        color: color,
        opacity,
      });
    }

    // We intentionally do not rotate the entire line before splitting into script runs.
    // Instead, rotation is applied per run inside the loop below so each run starts
    // from the correct pivot point. See https://github.com/pdfme/pdfme/issues/1347.

    let spacing = characterSpacing;
    if (alignment === 'justify' && line.slice(-1) !== '\n') {
      // if alignment is `justify` but the end of line is not newline, then adjust the spacing
      const segmenter = getGraphemeSegmenter();
      const iterator = segmenter.segment(trimmed)[Symbol.iterator]();
      const len = Array.from(iterator).length;
      spacing += (contentWidth - textWidth) / len;
    }
    page.pushOperators(pdfLib.setCharacterSpacing(spacing));

    // Split the trimmed line into homogeneous script runs. This prevents mixed
    // Latin/Thai strings from dropping Thai combining marks during shaping. Each
    // run is rendered sequentially with appropriate spacing.
    const runs = splitTextByScriptRuns(trimmed);
    let runX = xLine;

    runs.forEach((run, runIndex) => {
      let drawX = runX;
      let drawY = yLine;

      // Apply rotation per run rather than once per line. This ensures each run
      // starts from the correct rotated position relative to the pivot point.
      if (rotate.angle !== 0) {
        const rotatedPoint = rotatePoint({ x: drawX, y: drawY }, pivotPoint, rotate.angle);
        drawX = rotatedPoint.x;
        drawY = rotatedPoint.y;
      }

      page.drawText(run.text, {
        x: drawX,
        y: drawY,
        rotate,
        size: fontSize,
        color,
        lineHeight: lineHeight * fontSize,
        font: pdfFontValue,
        opacity,
      });

      // Advance the X position by the width of this run plus any extra spacing
      // between runs. Character spacing is applied within runs via
      // `setCharacterSpacing` above.
      runX +=
        widthOfTextAtSize(run.text, fontKitFont, fontSize, spacing) +
        getInterRunSpacing(spacing, runIndex, runs.length);
    });
  });
};

const drawTextBoxDecoration = (arg: {
  page: PDFRenderProps<TextSchema>['page'];
  schema: TextSchema;
  colorType?: ColorType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotate: ReturnType<typeof convertForPdfLayoutProps>['rotate'];
  pivotPoint: { x: number; y: number };
}) => {
  const { page, schema, colorType, x, y, width, height, rotate, pivotPoint } = arg;
  const { borderWidth } = getBoxInsets(schema);
  const opacity = schema.opacity ?? 1;

  const drawRectangle = (rect: {
    x: number;
    y: number;
    width: number;
    height: number;
    color: NonNullable<ReturnType<typeof hex2PrintingColor>>;
  }) => {
    if (rect.width <= 0 || rect.height <= 0) return;
    const point =
      rotate.angle === 0
        ? { x: rect.x, y: rect.y }
        : rotatePoint({ x: rect.x, y: rect.y }, pivotPoint, rotate.angle);
    page.drawRectangle({
      x: point.x,
      y: point.y,
      width: rect.width,
      height: rect.height,
      rotate,
      color: rect.color,
      opacity,
    });
  };

  if (schema.backgroundColor) {
    const color = hex2PrintingColor(schema.backgroundColor, colorType);
    if (color) drawRectangle({ x, y, width, height, color });
  }

  if (!schema.borderColor || !hasBoxDimension(schema.borderWidth)) return;

  const color = hex2PrintingColor(schema.borderColor, colorType);
  if (!color) return;

  const top = mm2pt(borderWidth.top);
  const right = mm2pt(borderWidth.right);
  const bottom = mm2pt(borderWidth.bottom);
  const left = mm2pt(borderWidth.left);

  drawRectangle({ x, y: y + height - top, width, height: top, color });
  drawRectangle({ x: x + width - right, y, width: right, height, color });
  drawRectangle({ x, y, width, height: bottom, color });
  drawRectangle({ x, y, width: left, height, color });
};
