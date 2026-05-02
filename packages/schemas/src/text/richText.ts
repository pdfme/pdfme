import type { Font } from '@pdfme/common';
import { getFallbackFontName } from '@pdfme/common';
import type { Font as FontKitFont } from 'fontkit';
import {
  DEFAULT_FONT_VARIANT_FALLBACK,
  FONT_VARIANT_FALLBACK_ERROR,
  FONT_VARIANT_FALLBACK_PLAIN,
  TEXT_FORMAT_INLINE_MARKDOWN,
} from './constants.js';
import { getFontKitFont, widthOfTextAtSize } from './helper.js';
import type { RichTextRun, TextSchema } from './types.js';

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
) => widthOfTextAtSize(text, run.fontKitFont, fontSize, characterSpacing);

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
  if (line.runs.length > 0) line.width += characterSpacing;
  line.runs.push({ ...run, text, width });
  line.width += width;
};

const splitIntoGraphemes = (value: string) => {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  return Array.from(segmenter.segment(value), ({ segment }) => segment);
};

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

  const pushText = (run: ResolvedRichTextRun, text: string) => {
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
        if (candidateWidth > maxWidth && fittingText) break;
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

  const wordSegmenter = new Intl.Segmenter(undefined, { granularity: 'word' });

  runs.forEach((run) => {
    run.text.split(/(\r\n|\r|\n)/).forEach((part) => {
      if (part === '\r\n' || part === '\r' || part === '\n') {
        pushCurrentLine(true);
        return;
      }

      Array.from(wordSegmenter.segment(part), ({ segment }) => segment).forEach((segment) => {
        pushText(run, segment);
      });
    });
  });

  if (currentLine.runs.length > 0 || lines.length === 0) {
    pushCurrentLine(false);
  }

  return lines;
};
