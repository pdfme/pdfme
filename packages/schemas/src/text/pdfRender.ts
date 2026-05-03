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
import { calculateDynamicRichTextFontSize, isInlineMarkdownTextSchema } from './richText.js';
import { renderInlineMarkdownText } from './richTextPdfRender.js';
import { convertForPdfLayoutProps, rotatePoint, hex2PrintingColor } from '../utils.js';

type PdfFontCache = Record<string, Promise<PDFFont>>;

const PDF_FONT_CACHE_KEY = 'text-pdf-font-cache';

const getPdfFontCache = (
  pdfDoc: PDFDocument,
  _cache: Map<string | number, unknown>,
): PdfFontCache => {
  let pdfFontCacheByDocument = _cache.get(PDF_FONT_CACHE_KEY) as
    | WeakMap<PDFDocument, PdfFontCache>
    | undefined;

  if (!pdfFontCacheByDocument) {
    pdfFontCacheByDocument = new WeakMap<PDFDocument, PdfFontCache>();
    _cache.set(PDF_FONT_CACHE_KEY, pdfFontCacheByDocument);
  }

  let pdfFontCache = pdfFontCacheByDocument.get(pdfDoc);
  if (!pdfFontCache) {
    pdfFontCache = {};
    pdfFontCacheByDocument.set(pdfDoc, pdfFontCache);
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
  const pdfFontCache = getPdfFontCache(pdfDoc, _cache);
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
  colorType,
  fontSize: resolvedFontSize,
}: {
  value: string;
  fontKitFont: FontKitFont;
  colorType?: ColorType;
  schema: TextSchema;
  fontSize?: number;
}) => {
  const fontSize =
    resolvedFontSize ??
    (schema.dynamicFontSize
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

export const pdfRender = async (arg: PDFRenderProps<TextSchema>) => {
  const { value, pdfDoc, pdfLib, page, options, schema, _cache } = arg;
  if (!value) return;

  const { font = getDefaultFont(), colorType } = options;
  const fontName = schema.fontName ? schema.fontName : getFallbackFontName(font);

  const [pdfFontValue, fontKitFont] = await Promise.all([
    embedAndGetFont({
      pdfDoc,
      font,
      fontName,
      _cache,
    }),
    getFontKitFont(schema.fontName, font, _cache as Map<string, FontKitFont>),
  ]);
  const enableInlineMarkdown = isInlineMarkdownTextSchema(schema);
  const displayValue = enableInlineMarkdown ? stripInlineMarkdown(value) : value;
  const dynamicRichTextFontSize =
    enableInlineMarkdown && schema.dynamicFontSize
      ? await calculateDynamicRichTextFontSize({ value, schema, font, _cache })
      : undefined;
  const fontProp = getFontProp({
    value: displayValue,
    fontKitFont,
    schema,
    colorType,
    fontSize: dynamicRichTextFontSize,
  });

  const { fontSize, color, alignment, verticalAlignment, lineHeight, characterSpacing } = fontProp;

  const pageHeight = page.getHeight();
  const {
    width,
    height,
    rotate,
    position: { x, y },
    opacity,
  } = convertForPdfLayoutProps({ schema, pageHeight, applyRotateTranslate: false });

  const pivotPoint = { x: x + width / 2, y: pageHeight - mm2pt(schema.position.y) - height / 2 };

  if (schema.backgroundColor) {
    const color = hex2PrintingColor(schema.backgroundColor, colorType);
    if (rotate.angle !== 0) {
      // Apply the same rotation logic as text rendering to match UI behavior
      const rotatedPoint = rotatePoint({ x, y }, pivotPoint, rotate.angle);
      page.drawRectangle({ x: rotatedPoint.x, y: rotatedPoint.y, width, height, rotate, color });
    } else {
      page.drawRectangle({ x, y, width, height, rotate, color });
    }
  }

  if (enableInlineMarkdown) {
    await renderInlineMarkdownText({
      value,
      schema,
      font,
      embedPdfFont: (fontName) => embedAndGetFont({ pdfDoc, font, fontName, _cache }),
      fontKitFont,
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
      x,
      width,
      height,
      pageHeight,
      pivotPoint,
      rotate,
      opacity,
    });
    return;
  }

  const firstLineTextHeight = heightOfFontAtSize(fontKitFont, fontSize);
  const descent = getFontDescentInPt(fontKitFont, fontSize);
  const halfLineHeightAdjustment = lineHeight === 0 ? 0 : ((lineHeight - 1) * fontSize) / 2;

  const lines = splitTextToSize({
    value,
    characterSpacing,
    fontSize,
    fontKitFont,
    boxWidthInPt: width,
  });
  const needsTextWidth = alignment !== 'left' || Boolean(schema.strikethrough || schema.underline);
  const needsTextHeight = Boolean(schema.strikethrough || schema.underline);

  // Text lines are rendered from the bottom upwards, we need to adjust the position down
  let yOffset = 0;
  if (verticalAlignment === VERTICAL_ALIGN_TOP) {
    yOffset = firstLineTextHeight + halfLineHeightAdjustment;
  } else {
    const otherLinesHeight = lineHeight * fontSize * (lines.length - 1);

    if (verticalAlignment === VERTICAL_ALIGN_BOTTOM) {
      yOffset = height - otherLinesHeight + descent - halfLineHeightAdjustment;
    } else if (verticalAlignment === VERTICAL_ALIGN_MIDDLE) {
      yOffset =
        (height - otherLinesHeight - firstLineTextHeight + descent) / 2 + firstLineTextHeight;
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

    let xLine = x;
    if (alignment === 'center') {
      xLine += (width - textWidth) / 2;
    } else if (alignment === 'right') {
      xLine += width - textWidth;
    }

    let yLine = pageHeight - mm2pt(schema.position.y) - yOffset - rowYOffset;

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

    if (rotate.angle !== 0) {
      // As we draw each line individually from different points, we must translate each lines position
      // relative to the UI rotation pivot point. see comments in convertForPdfLayoutProps() for more info.
      const rotatedPoint = rotatePoint({ x: xLine, y: yLine }, pivotPoint, rotate.angle);
      xLine = rotatedPoint.x;
      yLine = rotatedPoint.y;
    }

    let spacing = characterSpacing;
    if (alignment === 'justify' && line.slice(-1) !== '\n') {
      // if alignment is `justify` but the end of line is not newline, then adjust the spacing
      const segmenter = getGraphemeSegmenter();
      const iterator = segmenter.segment(trimmed)[Symbol.iterator]();
      const len = Array.from(iterator).length;
      spacing += (width - textWidth) / len;
    }
    page.pushOperators(pdfLib.setCharacterSpacing(spacing));

    page.drawText(trimmed, {
      x: xLine,
      y: yLine,
      rotate,
      size: fontSize,
      color,
      lineHeight: lineHeight * fontSize,
      font: pdfFontValue,
      opacity,
    });
  });
};
