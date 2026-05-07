import { getFallbackFontName, mm2pt, pt2mm, type Font } from '@pdfme/common';
import type { Font as FontKitFont } from 'fontkit';
import {
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_DYNAMIC_FIT,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_FONT_VARIANT_FALLBACK,
  CODE_HORIZONTAL_PADDING,
  DYNAMIC_FIT_HORIZONTAL,
  DYNAMIC_FIT_VERTICAL,
  FONT_SIZE_ADJUSTMENT,
  FONT_VARIANT_FALLBACK_ERROR,
  FONT_VARIANT_FALLBACK_PLAIN,
  SYNTHETIC_BOLD_OFFSET_RATIO,
  SYNTHETIC_BOLD_PDF_EXTRA_DRAWS,
  SYNTHETIC_ITALIC_SKEW_DEGREES,
  TEXT_FORMAT_INLINE_MARKDOWN,
} from './constants.js';
import { getFontKitFont, heightOfFontAtSize, widthOfTextAtSize } from './helper.js';
import { parseInlineMarkdown } from './inlineMarkdown.js';
import type { RichTextRun, TextSchema } from './types.js';
import { getBoxContentArea } from '../box.js';

export type ResolvedRichTextRun = RichTextRun & {
  fontName: string;
  fontKitFont: FontKitFont;
  syntheticBold: boolean;
  syntheticItalic: boolean;
};

export type RichTextLineRun = ResolvedRichTextRun & {
  width: number;
};

export type RichTextLine = {
  runs: RichTextLineRun[];
  width: number;
  hardBreak: boolean;
};

type FontVariantResolution = {
  fontName: string;
  syntheticBold: boolean;
  syntheticItalic: boolean;
};

type RichTextRunPiece = {
  run: ResolvedRichTextRun;
  text: string;
};

const richTextWordSegmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
const richTextGraphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

const getBaseFontName = (schema: TextSchema, font: Font) =>
  schema.fontName && font[schema.fontName] ? schema.fontName : getFallbackFontName(font);

const getLoadedFontName = (font: Font, fontName?: string) =>
  fontName && font[fontName] ? fontName : undefined;

export const isInlineMarkdownTextSchema = (schema: TextSchema) =>
  schema.textFormat === TEXT_FORMAT_INLINE_MARKDOWN &&
  !(schema.type === 'text' && schema.readOnly !== true);

export const resolveFontVariant = (
  run: RichTextRun,
  schema: TextSchema,
  font: Font,
): FontVariantResolution => {
  const baseFontName = getBaseFontName(schema, font);
  const variants = schema.fontVariants ?? {};
  const fallback = schema.fontVariantFallback ?? DEFAULT_FONT_VARIANT_FALLBACK;

  let fontName = baseFontName;
  let needsBold = Boolean(run.bold);
  let needsItalic = Boolean(run.italic);

  if (run.code) {
    fontName = getLoadedFontName(font, variants.code) ?? baseFontName;
  } else if (run.bold && run.italic) {
    const boldItalic = getLoadedFontName(font, variants.boldItalic);
    const italic = getLoadedFontName(font, variants.italic);
    const bold = getLoadedFontName(font, variants.bold);

    if (boldItalic) {
      fontName = boldItalic;
      needsBold = false;
      needsItalic = false;
    } else if (italic) {
      fontName = italic;
      needsItalic = false;
    } else if (bold) {
      fontName = bold;
      needsBold = false;
    }
  } else if (run.bold) {
    const bold = getLoadedFontName(font, variants.bold);
    if (bold) {
      fontName = bold;
      needsBold = false;
    }
  } else if (run.italic) {
    const italic = getLoadedFontName(font, variants.italic);
    if (italic) {
      fontName = italic;
      needsItalic = false;
    }
  }

  if (
    (needsBold || needsItalic || (run.code && !getLoadedFontName(font, variants.code))) &&
    fallback === FONT_VARIANT_FALLBACK_ERROR
  ) {
    throw new Error(
      `[@pdfme/schemas] Missing font variant for markdown text in field "${schema.name}".`,
    );
  }

  return {
    fontName,
    syntheticBold: fallback !== FONT_VARIANT_FALLBACK_PLAIN && needsBold,
    syntheticItalic: fallback !== FONT_VARIANT_FALLBACK_PLAIN && needsItalic,
  };
};

export const resolveRichTextRuns = async (arg: {
  runs: RichTextRun[];
  schema: TextSchema;
  font: Font;
  _cache: Map<string | number, unknown>;
}): Promise<ResolvedRichTextRun[]> => {
  const { runs, schema, font, _cache } = arg;
  const fontKitCache = new Map<string, FontKitFont>();

  const getResolvedFontKitFont = async (fontName: string) => {
    const cached = fontKitCache.get(fontName);
    if (cached) return cached;

    const fontKitFont = await getFontKitFont(fontName, font, _cache as Map<string, FontKitFont>);
    fontKitCache.set(fontName, fontKitFont);
    return fontKitFont;
  };

  return Promise.all(
    runs.map(async (run) => {
      const resolution = resolveFontVariant(run, schema, font);
      return {
        ...run,
        ...resolution,
        fontKitFont: await getResolvedFontKitFont(resolution.fontName),
      };
    }),
  );
};

const measureRunText = (
  run: ResolvedRichTextRun,
  text: string,
  fontSize: number,
  characterSpacing: number,
) => {
  const syntheticBoldWidth = run.syntheticBold
    ? fontSize * SYNTHETIC_BOLD_OFFSET_RATIO * SYNTHETIC_BOLD_PDF_EXTRA_DRAWS
    : 0;
  const syntheticItalicWidth = run.syntheticItalic
    ? heightOfFontAtSize(run.fontKitFont, fontSize) *
      Math.tan((SYNTHETIC_ITALIC_SKEW_DEGREES * Math.PI) / 180)
    : 0;
  return (
    widthOfTextAtSize(text, run.fontKitFont, fontSize, characterSpacing) +
    syntheticBoldWidth +
    syntheticItalicWidth +
    (run.code ? CODE_HORIZONTAL_PADDING * 2 : 0)
  );
};

const createLine = (): RichTextLine => ({ runs: [], width: 0, hardBreak: false });

const pushRunToLine = (
  line: RichTextLine,
  run: ResolvedRichTextRun,
  text: string,
  fontSize: number,
  characterSpacing: number,
) => {
  if (!text) return;
  const width = measureRunText(run, text, fontSize, characterSpacing);
  const lastRun = line.runs[line.runs.length - 1];
  if (lastRun && canMergeRichTextRuns(lastRun, run)) {
    // Adjacent pieces from the same logical rich-text span should stay one run so spacing,
    // inline code padding, and synthetic font offsets are measured for the combined span.
    const previousWidth = lastRun.width;
    lastRun.text += text;
    lastRun.width = measureRunText(lastRun, lastRun.text, fontSize, characterSpacing);
    line.width += lastRun.width - previousWidth;
    return;
  }

  if (line.runs.length > 0) line.width += characterSpacing;
  line.runs.push({ ...run, text, width });
  line.width += width;
};

const canMergeRichTextRuns = (a: ResolvedRichTextRun, b: ResolvedRichTextRun) =>
  a.fontName === b.fontName &&
  a.fontKitFont === b.fontKitFont &&
  a.syntheticBold === b.syntheticBold &&
  a.syntheticItalic === b.syntheticItalic &&
  a.bold === b.bold &&
  a.italic === b.italic &&
  a.strikethrough === b.strikethrough &&
  a.code === b.code &&
  a.href === b.href;

const measurePiecesWidth = (
  pieces: RichTextRunPiece[],
  fontSize: number,
  characterSpacing: number,
) => {
  let width = 0;
  let hasText = false;
  pieces.forEach((piece) => {
    if (!piece.text) return;
    if (hasText) width += characterSpacing;
    width += measureRunText(piece.run, piece.text, fontSize, characterSpacing);
    hasText = true;
  });
  return width;
};

const sliceRunPieces = (
  pieces: RichTextRunPiece[],
  startIndex: number,
  endIndex: number,
): RichTextRunPiece[] => {
  const result: RichTextRunPiece[] = [];
  let offset = 0;

  pieces.forEach((piece) => {
    const pieceStart = offset;
    const pieceEnd = pieceStart + piece.text.length;
    const sliceStart = Math.max(startIndex, pieceStart);
    const sliceEnd = Math.min(endIndex, pieceEnd);

    if (sliceStart < sliceEnd) {
      result.push({
        run: piece.run,
        text: piece.text.slice(sliceStart - pieceStart, sliceEnd - pieceStart),
      });
    }

    offset = pieceEnd;
  });

  return result;
};

const segmentRunPiecesByWord = (
  runs: ResolvedRichTextRun[],
  onSegment: (pieces: RichTextRunPiece[]) => void,
  onHardBreak: () => void,
) => {
  let paragraphPieces: RichTextRunPiece[] = [];

  const flushParagraph = () => {
    if (paragraphPieces.length === 0) return;

    const paragraphText = paragraphPieces.map((piece) => piece.text).join('');
    Array.from(richTextWordSegmenter.segment(paragraphText), ({ segment, index }) => {
      const pieces = sliceRunPieces(paragraphPieces, index, index + segment.length);
      if (pieces.length > 0) onSegment(pieces);
    });
    paragraphPieces = [];
  };

  runs.forEach((run) => {
    run.text.split(/(\r\n|\r|\n)/).forEach((part) => {
      if (part === '\r\n' || part === '\r' || part === '\n') {
        flushParagraph();
        onHardBreak();
        return;
      }

      if (part) paragraphPieces.push({ run, text: part });
    });
  });

  flushParagraph();
};

const splitIntoGraphemes = (value: string) =>
  Array.from(richTextGraphemeSegmenter.segment(value), ({ segment }) => segment);

export const countRichTextLineGraphemes = (line: RichTextLine) =>
  splitIntoGraphemes(line.runs.map((run) => run.text).join('')).length;

export const getRichTextLineText = (line: RichTextLine) =>
  line.runs.map((run) => run.text).join('');

export const layoutRichTextLines = (arg: {
  runs: ResolvedRichTextRun[];
  fontSize: number;
  characterSpacing: number;
  boxWidthInPt: number;
}): RichTextLine[] => {
  const { runs, fontSize, characterSpacing, boxWidthInPt } = arg;
  const lines: RichTextLine[] = [];
  let currentLine = createLine();

  const pushCurrentLine = (hardBreak: boolean) => {
    currentLine.hardBreak = hardBreak;
    lines.push(currentLine);
    currentLine = createLine();
  };

  const pushPiecesToLine = (pieces: RichTextRunPiece[]) => {
    pieces.forEach((piece) => {
      pushRunToLine(currentLine, piece.run, piece.text, fontSize, characterSpacing);
    });
  };

  const pushOversizedText = (run: ResolvedRichTextRun, text: string) => {
    let remainingText = text;

    while (remainingText.length > 0) {
      const pendingSpacing = currentLine.runs.length > 0 ? characterSpacing : 0;
      const remainingWidth = Math.max(boxWidthInPt - currentLine.width - pendingSpacing, 0);
      const remainingTextWidth = measureRunText(run, remainingText, fontSize, characterSpacing);

      if (
        remainingTextWidth <= remainingWidth ||
        (currentLine.runs.length === 0 && remainingTextWidth <= boxWidthInPt)
      ) {
        pushRunToLine(currentLine, run, remainingText, fontSize, characterSpacing);
        return;
      }

      if (currentLine.runs.length > 0 && remainingTextWidth <= boxWidthInPt) {
        pushCurrentLine(false);
        continue;
      }

      const graphemes = splitIntoGraphemes(remainingText);
      let fittingText = '';
      let fittingLength = 0;

      for (const grapheme of graphemes) {
        const candidate = fittingText + grapheme;
        const candidateWidth = measureRunText(run, candidate, fontSize, characterSpacing);
        const maxWidth = currentLine.runs.length === 0 ? boxWidthInPt : remainingWidth;
        if (candidateWidth > maxWidth) {
          if (fittingText) break;
          if (currentLine.runs.length > 0) break;
        }
        fittingText = candidate;
        fittingLength += grapheme.length;
        if (candidateWidth > maxWidth) break;
      }

      if (!fittingText) {
        pushCurrentLine(false);
        continue;
      }

      pushRunToLine(currentLine, run, fittingText, fontSize, characterSpacing);
      remainingText = remainingText.slice(fittingLength);
      if (remainingText.length > 0) pushCurrentLine(false);
    }
  };

  const pushSegment = (pieces: RichTextRunPiece[]) => {
    const segmentWidth = measurePiecesWidth(pieces, fontSize, characterSpacing);
    const pendingSpacing = currentLine.runs.length > 0 ? characterSpacing : 0;
    const remainingWidth = Math.max(boxWidthInPt - currentLine.width - pendingSpacing, 0);

    if (
      segmentWidth <= remainingWidth ||
      (currentLine.runs.length === 0 && segmentWidth <= boxWidthInPt)
    ) {
      pushPiecesToLine(pieces);
      return;
    }

    if (currentLine.runs.length > 0) {
      pushCurrentLine(false);
      if (segmentWidth <= boxWidthInPt) {
        pushPiecesToLine(pieces);
        return;
      }
    }

    pieces.forEach((piece) => pushOversizedText(piece.run, piece.text));
  };

  segmentRunPiecesByWord(runs, pushSegment, () => pushCurrentLine(true));

  if (currentLine.runs.length > 0 || lines.length === 0) {
    pushCurrentLine(false);
  }

  return lines;
};

const measureParagraphWidths = (
  runs: ResolvedRichTextRun[],
  fontSize: number,
  characterSpacing: number,
) => {
  const widths: number[] = [];
  let paragraphPieces: RichTextRunPiece[] = [];

  const pushWidth = () => {
    widths.push(measurePiecesWidth(paragraphPieces, fontSize, characterSpacing));
    paragraphPieces = [];
  };

  runs.forEach((run) => {
    run.text.split(/(\r\n|\r|\n)/).forEach((part) => {
      if (part === '\r\n' || part === '\r' || part === '\n') {
        pushWidth();
        return;
      }

      if (part) paragraphPieces.push({ run, text: part });
    });
  });

  pushWidth();
  return widths;
};

const getLineHeightAtSize = (line: RichTextLine, fontSize: number) => {
  if (line.runs.length === 0) return fontSize;
  return Math.max(...line.runs.map((run) => heightOfFontAtSize(run.fontKitFont, fontSize)));
};

export const calculateDynamicRichTextFontSize = async (arg: {
  value: string;
  schema: TextSchema;
  font: Font;
  _cache: Map<string | number, unknown>;
  startingFontSize?: number | undefined;
}) => {
  const { value, schema, font, _cache, startingFontSize } = arg;
  const {
    fontSize: schemaFontSize,
    dynamicFontSize: dynamicFontSizeSetting,
    characterSpacing: schemaCharacterSpacing,
    lineHeight = DEFAULT_LINE_HEIGHT,
  } = schema;
  const { width: boxWidth, height: boxHeight } = getBoxContentArea(schema);
  const fontSize = startingFontSize || schemaFontSize || DEFAULT_FONT_SIZE;
  if (!dynamicFontSizeSetting) return fontSize;
  if (dynamicFontSizeSetting.max < dynamicFontSizeSetting.min) return fontSize;

  const richTextRuns = parseInlineMarkdown(value);
  const resolvedRuns = await resolveRichTextRuns({ runs: richTextRuns, schema, font, _cache });
  const characterSpacing = schemaCharacterSpacing ?? DEFAULT_CHARACTER_SPACING;
  const dynamicFontFit = dynamicFontSizeSetting.fit ?? DEFAULT_DYNAMIC_FIT;
  const boxWidthInPt = mm2pt(boxWidth);

  let dynamicFontSize = fontSize;
  if (dynamicFontSize < dynamicFontSizeSetting.min) {
    dynamicFontSize = dynamicFontSizeSetting.min;
  } else if (dynamicFontSize > dynamicFontSizeSetting.max) {
    dynamicFontSize = dynamicFontSizeSetting.max;
  }

  const calculateConstraints = (size: number) => {
    let totalWidthInMm = 0;
    let totalHeightInMm = 0;

    const lines = layoutRichTextLines({
      runs: resolvedRuns,
      fontSize: size,
      characterSpacing,
      boxWidthInPt,
    });

    lines.forEach((line, lineIndex) => {
      if (dynamicFontFit === DYNAMIC_FIT_VERTICAL) {
        totalWidthInMm = Math.max(totalWidthInMm, pt2mm(line.width));
      }

      if (lineIndex === 0) {
        totalHeightInMm += pt2mm(getLineHeightAtSize(line, size) * lineHeight);
      } else {
        totalHeightInMm += pt2mm(size * lineHeight);
      }
    });

    if (dynamicFontFit === DYNAMIC_FIT_HORIZONTAL) {
      measureParagraphWidths(resolvedRuns, size, characterSpacing).forEach((paragraphWidth) => {
        totalWidthInMm = Math.max(totalWidthInMm, pt2mm(paragraphWidth));
      });
    }

    return { totalWidthInMm, totalHeightInMm };
  };

  const shouldFontGrowToFit = (totalWidthInMm: number, totalHeightInMm: number) => {
    if (dynamicFontSize >= dynamicFontSizeSetting.max) {
      return false;
    }
    if (dynamicFontFit === DYNAMIC_FIT_HORIZONTAL) {
      return totalWidthInMm < boxWidth;
    }
    return totalHeightInMm < boxHeight;
  };

  const shouldFontShrinkToFit = (totalWidthInMm: number, totalHeightInMm: number) => {
    if (dynamicFontSize <= dynamicFontSizeSetting.min || dynamicFontSize <= 0) {
      return false;
    }
    return totalWidthInMm > boxWidth || totalHeightInMm > boxHeight;
  };

  let { totalWidthInMm, totalHeightInMm } = calculateConstraints(dynamicFontSize);

  while (shouldFontGrowToFit(totalWidthInMm, totalHeightInMm)) {
    dynamicFontSize += FONT_SIZE_ADJUSTMENT;
    const { totalWidthInMm: newWidth, totalHeightInMm: newHeight } =
      calculateConstraints(dynamicFontSize);

    if (newHeight < boxHeight) {
      totalWidthInMm = newWidth;
      totalHeightInMm = newHeight;
    } else {
      dynamicFontSize -= FONT_SIZE_ADJUSTMENT;
      break;
    }
  }

  while (shouldFontShrinkToFit(totalWidthInMm, totalHeightInMm)) {
    dynamicFontSize -= FONT_SIZE_ADJUSTMENT;
    ({ totalWidthInMm, totalHeightInMm } = calculateConstraints(dynamicFontSize));
  }

  return dynamicFontSize;
};
