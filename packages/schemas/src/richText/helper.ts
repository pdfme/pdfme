import * as fontkit from 'fontkit';
import type { Font as FontKitFont } from 'fontkit';
import {
  b64toUint8Array,
  mm2pt,
  pt2mm,
  pt2px,
  Font,
  getFallbackFontName,
  getDefaultFont,
  DEFAULT_FONT_NAME,
} from '@pdfme/common';
import { Buffer } from 'buffer';
import type {
  RichTextSchema,
  FontWidthCalcValues,
  RichTextLetterStyle,
  RichTextLetter,
} from './types';
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_LINE_HEIGHT,
  FONT_SIZE_ADJUSTMENT,
  DEFAULT_DYNAMIC_FIT,
  DYNAMIC_FIT_HORIZONTAL,
  DYNAMIC_FIT_VERTICAL,
  VERTICAL_ALIGN_TOP,
} from './constants.js';

export const getBrowserVerticalFontAdjustments = (
  fontKitFont: FontKitFont,
  fontSize: number,
  lineHeight: number,
  verticalAlignment: string
) => {
  const { ascent, descent, unitsPerEm } = fontKitFont;

  // Fonts have a designed line height that the browser renders when using `line-height: normal`
  const fontBaseLineHeight = (ascent - descent) / unitsPerEm;

  // For vertical alignment top
  // To achieve consistent positioning between browser and PDF, we apply the difference between
  // the font's actual height and the font size in pixels.
  // Browsers middle the font within this height, so we only need half of it to apply to the top.
  // This means the font renders a bit lower in the browser, but achieves PDF alignment
  const topAdjustment = (fontBaseLineHeight * fontSize - fontSize) / 2;

  if (verticalAlignment === VERTICAL_ALIGN_TOP) {
    return { topAdj: pt2px(topAdjustment), bottomAdj: 0 };
  }

  // For vertical alignment bottom and middle
  // When browsers render text in a non-form element (such as a <div>), some of the text may be
  // lowered below and outside the containing element if the line height used is less than
  // the base line-height of the font.
  // This behaviour does not happen in a <textarea> though, so we need to adjust the positioning
  // for consistency between editing and viewing to stop text jumping up and down.
  // This portion of text is half of the difference between the base line height and the used
  // line height. If using the same or higher line-height than the base font, then line-height
  // takes over in the browser and this adjustment is not needed.
  // Unlike the top adjustment - this is only driven by browser behaviour, not PDF alignment.
  let bottomAdjustment = 0;
  if (lineHeight < fontBaseLineHeight) {
    bottomAdjustment = ((fontBaseLineHeight - lineHeight) * fontSize) / 2;
  }

  return { topAdj: 0, bottomAdj: pt2px(bottomAdjustment) };
};

export const getFontDescentInPt = (fontKitFont: FontKitFont, fontSize: number) => {
  const { descent, unitsPerEm } = fontKitFont;

  return (descent / unitsPerEm) * fontSize;
};

export const heightOfFontAtSize = (fontKitFont: FontKitFont, fontSize: number) => {
  const { ascent, descent, bbox, unitsPerEm } = fontKitFont;

  const scale = 1000 / unitsPerEm;
  const yTop = (ascent || bbox.maxY) * scale;
  const yBottom = (descent || bbox.minY) * scale;

  let height = yTop - yBottom;
  height -= Math.abs(descent * scale) || 0;

  return (height / 1000) * fontSize;
};

/**
 * Note this change is made in consideration that text content length in rich text will always be one
 */
const calculateCharacterSpacing = (textContent: string, textCharacterSpacing: number) => {
  // return (textContent.length - 1) * textCharacterSpacing;
  // text content len should always be 1
  return textCharacterSpacing;
};

export const widthOfTextAtSize = (
  text: string,
  fontKitFont: FontKitFont,
  fontSize: number,
  characterSpacing: number
) => {
  const { glyphs } = fontKitFont.layout(text);
  const scale = 1000 / fontKitFont.unitsPerEm;
  const standardWidth =
    glyphs.reduce((totalWidth, glyph) => totalWidth + glyph.advanceWidth * scale, 0) *
    (fontSize / 1000);
  return standardWidth + calculateCharacterSpacing(text, characterSpacing);
};

const getFallbackFont = (font: Font) => {
  const fallbackFontName = getFallbackFontName(font);
  return font[fallbackFontName];
};

const getCacheKey = (fontName: string) => `getFontKitFont-${fontName}`;

export const getFontKitFont = async (
  fontName: string | undefined,
  font: Font,
  _cache: Map<any, any>
) => {
  const fntNm = fontName || getFallbackFontName(font);
  const cacheKey = getCacheKey(fntNm);
  if (_cache.has(cacheKey)) {
    return _cache.get(cacheKey) as fontkit.Font;
  }

  const currentFont = font[fntNm] || getFallbackFont(font) || getDefaultFont()[DEFAULT_FONT_NAME];
  let fontData = currentFont.data;
  if (typeof fontData === 'string') {
    fontData = fontData.startsWith('http')
      ? await fetch(fontData).then((res) => res.arrayBuffer())
      : b64toUint8Array(fontData);
  }

  const fontKitFont = fontkit.create(
    fontData instanceof Buffer ? fontData : Buffer.from(fontData as ArrayBuffer)
  ) as fontkit.Font;
  _cache.set(cacheKey, fontKitFont);

  return fontKitFont;
};

const isTextExceedingBoxWidth = (text: string, calcValues: FontWidthCalcValues) => {
  const { font, fontSize, characterSpacing, boxWidthInPt } = calcValues;
  const textWidth = widthOfTextAtSize(text, font, fontSize, characterSpacing);
  return textWidth > boxWidthInPt;
};

/**
 * Incrementally checks the current line for its real length
 * and returns the position where it exceeds the box width.
 * Returns `null` to indicate if textLine is shorter than the available box.
 */
const getOverPosition = (textLine: string, calcValues: FontWidthCalcValues) => {
  for (let i = 0; i <= textLine.length; i++) {
    if (isTextExceedingBoxWidth(textLine.slice(0, i + 1), calcValues)) {
      return i;
    }
  }

  return null;
};

/**
 * Line breakable chars depend on the language and writing system.
 * Western writing systems typically use spaces and hyphens as line breakable chars.
 * Other writing systems often break on word boundaries so the following
 * does not negatively impact them.
 * However, this might need to be revisited for broader language support.
 */
const isLineBreakableChar = (char: string) => {
  const lineBreakableChars = [' ', '-', '\u2014', '\u2013', '\n'];
  return lineBreakableChars.includes(char);
};

/**
 * Gets the position of the split. Splits the exceeding line at
 * the last breakable char prior to it exceeding the bounding box width.
 */
const getSplitPosition = (textLine: string, calcValues: FontWidthCalcValues) => {
  const overPos = getOverPosition(textLine, calcValues);
  if (overPos === null) return textLine.length; // input line is shorter than the available space

  if (textLine[overPos] === ' ') {
    // if the character immediately beyond the boundary is a space, split
    return overPos;
  }

  let overPosTmp = overPos - 1;
  while (overPosTmp >= 0) {
    if (isLineBreakableChar(textLine[overPosTmp])) {
      return overPosTmp + 1;
    }
    overPosTmp--;
  }

  // For very long lines with no breakable chars use the original overPos
  return overPos;
};

/**
 * Recursively splits the line at getSplitPosition.
 * If there is some leftover, split the rest again in the same manner.
 */
export const getSplittedLines = (textLine: string, calcValues: FontWidthCalcValues): string[] => {
  const splitPos = getSplitPosition(textLine, calcValues);
  const splittedLine = textLine.substring(0, splitPos).trimEnd();
  const rest = textLine.substring(splitPos).trimStart();

  if (rest === textLine) {
    // if we went so small that we want to split on the first char
    // then end recursion to avoid infinite loop
    return [textLine];
  }

  if (rest.length === 0) {
    // end recursion if there is no leftover
    return [splittedLine];
  }

  return [splittedLine, ...getSplittedLines(rest, calcValues)];
};

/**
 * If using dynamic font size, iteratively increment or decrement the
 * font size to fit the containing box.
 * Calculating space usage involves splitting lines where they exceed
 * the box width based on the proposed size.
 */
export const calculateDynamicFontSize = async ({
  textSchema,
  font,
  value,
  startingFontSize,
  _cache,
}: {
  textSchema: RichTextSchema;
  font: Font;
  value: string;
  startingFontSize?: number | undefined;
  _cache: Map<any, any>;
}) => {
  const {
    fontSize: schemaFontSize,
    dynamicFontSize: dynamicFontSizeSetting,
    characterSpacing: schemaCharacterSpacing,
    width: boxWidth,
    height: boxHeight,
    lineHeight = DEFAULT_LINE_HEIGHT,
  } = textSchema;
  const fontSize = startingFontSize || schemaFontSize || DEFAULT_FONT_SIZE;
  if (!dynamicFontSizeSetting) return fontSize;
  if (dynamicFontSizeSetting.max < dynamicFontSizeSetting.min) return fontSize;

  const characterSpacing = schemaCharacterSpacing ?? DEFAULT_CHARACTER_SPACING;
  const fontKitFont = await getFontKitFont(textSchema.fontName, font, _cache);
  const paragraphs = value.split('\n');

  let dynamicFontSize = fontSize;
  if (dynamicFontSize < dynamicFontSizeSetting.min) {
    dynamicFontSize = dynamicFontSizeSetting.min;
  } else if (dynamicFontSize > dynamicFontSizeSetting.max) {
    dynamicFontSize = dynamicFontSizeSetting.max;
  }
  const dynamicFontFit = dynamicFontSizeSetting.fit ?? DEFAULT_DYNAMIC_FIT;

  const calculateConstraints = (size: number) => {
    let totalWidthInMm = 0;
    let totalHeightInMm = 0;

    const boxWidthInPt = mm2pt(boxWidth);
    const firstLineTextHeight = heightOfFontAtSize(fontKitFont, size);
    const firstLineHeightInMm = pt2mm(firstLineTextHeight * lineHeight);
    const otherRowHeightInMm = pt2mm(size * lineHeight);

    paragraphs.forEach((paragraph, paraIndex) => {
      const lines = getSplittedLines(paragraph, {
        font: fontKitFont,
        fontSize: size,
        characterSpacing,
        boxWidthInPt,
      });
      lines.forEach((line, lineIndex) => {
        if (dynamicFontFit === DYNAMIC_FIT_VERTICAL) {
          // For vertical fit we want to consider the width of text lines where we detect a split
          const textWidth = widthOfTextAtSize(line, fontKitFont, size, characterSpacing);
          const textWidthInMm = pt2mm(textWidth);
          totalWidthInMm = Math.max(totalWidthInMm, textWidthInMm);
        }

        if (paraIndex + lineIndex === 0) {
          totalHeightInMm += firstLineHeightInMm;
        } else {
          totalHeightInMm += otherRowHeightInMm;
        }
      });
      if (dynamicFontFit === DYNAMIC_FIT_HORIZONTAL) {
        // For horizontal fit we want to consider the line's width 'unsplit'
        const textWidth = widthOfTextAtSize(paragraph, fontKitFont, size, characterSpacing);
        const textWidthInMm = pt2mm(textWidth);
        totalWidthInMm = Math.max(totalWidthInMm, textWidthInMm);
      }
    });

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

  // Attempt to increase the font size up to desired fit
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

  // Attempt to decrease the font size down to desired fit
  while (shouldFontShrinkToFit(totalWidthInMm, totalHeightInMm)) {
    dynamicFontSize -= FONT_SIZE_ADJUSTMENT;
    ({ totalWidthInMm, totalHeightInMm } = calculateConstraints(dynamicFontSize));
  }

  return dynamicFontSize;
};

export const splitTextToSize = (arg: {
  value: string;
  characterSpacing: number;
  boxWidthInPt: number;
  fontSize: number;
  fontKitFont: fontkit.Font;
}) => {
  const { value, characterSpacing, fontSize, fontKitFont, boxWidthInPt } = arg;
  const fontWidthCalcValues: FontWidthCalcValues = {
    font: fontKitFont,
    fontSize,
    characterSpacing,
    boxWidthInPt,
  };
  let lines: string[] = [];
  value.split(/\r\n|\r|\n|\f|\u000B/g).forEach((line: string) => {
    lines = lines.concat(getSplittedLines(line, fontWidthCalcValues));
  });
  return lines;
};
export const isFirefox = () => navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

// # new code -----------------------------------
export const color2Hex = (color: string): string => {
  if (color.startsWith('#')) {
    return color;
  }

  const toHex = (value: number): string => value.toString(16).padStart(2, '0');

  if (color.startsWith('rgba')) {
    const rgba = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
    if (rgba) {
      const [, r, g, b, a] = rgba.map(Number);
      const alpha = Math.round(a * 255); // Convert alpha to 0-255
      return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(alpha)}`;
    }
  }

  if (color.startsWith('rgb')) {
    const rgb = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgb) {
      const [, r, g, b] = rgb.map(Number);
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
  }

  return color;
};

export const CSSProps2RichTextLetterStyle = (node: HTMLElement) => {
  const style: RichTextLetterStyle = {};
  if (node.style.fontFamily) {
    style.fontName = node.style.fontFamily;
  }
  if (node.style.fontSize && !isNaN(parseFloat(node.style.fontSize))) {
    style.fontSize = parseFloat(node.style.fontSize);
  }
  if (node.style.letterSpacing && !isNaN(parseFloat(node.style.letterSpacing))) {
    style.characterSpacing = parseFloat(node.style.letterSpacing);
  }
  if (node.style.lineHeight && !isNaN(parseFloat(node.style.lineHeight))) {
    style.lineHeight = parseFloat(node.style.lineHeight);
  }
  if (node.style.color) {
    style.fontColor = color2Hex(node.style.color);
  }
  if (node.style.backgroundColor) {
    style.backgroundColor = color2Hex(node.style.backgroundColor);
  }
  if (node.style.textDecoration?.includes('underline')) {
    style.underline = true;
  }
  if (node.style.textDecoration?.includes('line-through')) {
    style.strikethrough = true;
  }
  if (node.style.opacity && !isNaN(parseFloat(node.style.opacity))) {
    style.opacity = parseFloat(node.style.opacity);
  }
  if (node.style.letterSpacing && !isNaN(parseFloat(node.style.letterSpacing))) {
    style.characterSpacing = parseFloat(node.style.letterSpacing);
  }
  return style;
};

export const schema2RichTextLetterStyle = (schema: RichTextSchema) => {
  return {
    fontName: schema.fontName,
    fontSize: schema.fontSize,
    characterSpacing: schema.characterSpacing,
    lineHeight: schema.lineHeight,
    fontColor: schema.fontColor,
    // backgroundColor: schema.backgroundColor,
    underline: schema.underline,
    strikethrough: schema.strikethrough,
    opacity: schema.opacity,
  };
};

export const richTextLetterStyle2Css = (style: RichTextLetterStyle) => {
  let css = '';
  if (style.fontName) {
    css += `font-family:${style.fontName};`;
  }
  if (style.fontSize) {
    css += `font-size:${style.fontSize}pt;`;
  }
  if (style.characterSpacing) {
    // css += `letter-spacing:${
    //   lettersLength === letterIdx + 1 ? 0 : style.characterSpacing || 'inherit'
    // };`;
    css += `letter-spacing:${style.characterSpacing}pt;`;
  }
  if (style.lineHeight) {
    css += `line-height:${style.lineHeight}em;`;
  }
  if (style.fontColor) {
    css += `color:${style.fontColor};`;
  }
  if (style.backgroundColor) {
    css += `background-color:${style.backgroundColor};`;
  }
  let textDecorations = [];
  if (style.underline) {
    textDecorations.push('underline');
  }
  if (style.strikethrough) {
    textDecorations.push('line-through');
  }
  if (textDecorations.length > 0) {
    css += `text-decoration:${textDecorations.join(' ')};`;
  }
  if (style.opacity !== undefined) {
    css += `opacity:${style.opacity};`;
  }
  return css;
};

export const richTextLetters2Html = (richTextLetters: RichTextLetter[]) => {
  return richTextLetters
    .map(
      (l, i) =>
        `<span style="${richTextLetterStyle2Css(l.style)}" data-rtl-idx="${i}">${l.letter}</span>`
    )
    .join('');
};

export const content2RichTextLetters = (content: string): RichTextLetter[] => {
  return JSON.parse(content).map((l: RichTextLetter) => ({
    letter: l?.letter || '',
    style: {
      fontName: l?.style?.fontName,
      fontSize: l?.style?.fontSize,
      characterSpacing: l?.style?.characterSpacing,
      lineHeight: l?.style?.lineHeight,
      fontColor: l?.style?.fontColor,
      backgroundColor: l?.style?.backgroundColor,
      underline: l?.style?.underline,
      strikethrough: l?.style?.strikethrough,
      opacity: l?.style?.opacity,
    },
  }));
};

export const editableHtml2RichTextLetters = (
  html: HTMLElement,
  defaultStyle?: RichTextLetterStyle
) => {
  const letters: RichTextLetter[] = [];
  html.childNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE && node.nodeName === 'SPAN') {
      let span = node as HTMLSpanElement;
      if (node.textContent?.length && node.textContent?.length > 1) {
        node.textContent?.split('').forEach((letter, i) => {
          letters.push({
            letter,
            style: { ...defaultStyle, ...CSSProps2RichTextLetterStyle(span) },
          });
        });
      } else {
        letters.push({
          letter: node.textContent || '',
          style: { ...defaultStyle, ...CSSProps2RichTextLetterStyle(span) },
        });
      }
    }
    if (node.nodeType === Node.TEXT_NODE) {
      letters.push({
        letter: node.textContent || '',
        style: { ...defaultStyle },
      });
    }
  });
  return letters;
};

const fontStyleMap: Record<string, string> = {
  Regular_2_Bold: 'Bold',
  Regular_2_Italic: 'Italic',
  Regular_2_BoldItalic: 'BoldItalic',
  Bold_2_Bold: 'Regular',
  Bold_2_Italic: 'BoldItalic',
  Bold_2_BoldItalic: 'Italic',
  Italic_2_Italic: 'Regular',
  Italic_2_Bold: 'BoldItalic',
  Italic_2_BoldItalic: 'Bold',
  BoldItalic_2_Bold: 'Italic',
  BoldItalic_2_Italic: 'Bold',
  BoldItalic_2_BoldItalic: 'Regular',
};

export const parseFontName = ({
  fontName,
  _cache,
  options,
}: {
  fontName?: string;
  _cache?: Map<any, any>;
  options?: { bold?: boolean; italic?: boolean };
}) => {
  if (!fontName) return fontName;

  const cacheKey = `parseFontName-${fontName}-bold-${options?.bold}-italic-${options?.italic}`;
  if (_cache && _cache.has(cacheKey)) {
    return _cache.get(cacheKey) as string;
  }

  const { bold, italic } = options || {};
  let [baseName, fromStyle] = fontName.split('-');
  let toStyle = 'Regular';
  if (bold) {
    toStyle = 'Bold';
  }
  if (italic) {
    toStyle = 'Italic';
  }
  if (bold && italic) {
    toStyle = 'BoldItalic';
  }

  const newModifier = fontStyleMap[`${fromStyle}_2_${toStyle}`] || fromStyle;
  const newFontName = `${baseName}-${newModifier}`;

  if (_cache) _cache.set(cacheKey, newFontName);
  return newFontName;
};

export const getSplittedRichtTextLines = async (
  lines: RichTextLetter[][],
  originalSchema: RichTextSchema,
  font: Font,
  _cache: Map<any, any>
): Promise<RichTextLetter[][]> => {
  let linesWithOverflow: RichTextLetter[][] = [];

  for (const [lIdx, line] of lines.entries()) {
    let usedLineWidth = 0;
    let newLine: RichTextLetter[] = [];

    for (const [cIdx, char] of line.entries()) {
      let schema = { ...originalSchema, ...char.style };
      const boxWidthInPt = mm2pt(schema.width);
      const fontKitFont = await getFontKitFont(schema.fontName, font, _cache);

      usedLineWidth += widthOfTextAtSize(
        char.letter,
        fontKitFont,
        schema.fontSize,
        schema.characterSpacing
      );

      if (usedLineWidth > boxWidthInPt) {
        linesWithOverflow.push(newLine);
        let restOfLetters = line.slice(cIdx);
        let restOfLines = lines.slice(lIdx + 1);

        if (restOfLetters.length > 0) {
          restOfLines.unshift(restOfLetters);
        }

        let recursiveLines = await getSplittedRichtTextLines(restOfLines, schema, font, _cache);
        return [...linesWithOverflow, ...recursiveLines];
      } else {
        newLine.push(char);
      }
    }

    if (newLine.length > 0) {
      linesWithOverflow.push(newLine);
    }
  }

  return linesWithOverflow;
};

export const splitRichTextLettersToLines = async (
  richTextLetters: RichTextLetter[],
  schema: RichTextSchema,
  font: Font,
  _cache: Map<any, any>
) => {
  const lines: RichTextLetter[][] = [];

  // step 1: iterate over the letters
  // check if the letter is a line breakable char
  // if it is, then push the line to the lines array
  let line: RichTextLetter[] = [];
  richTextLetters.forEach((letter, _) => {
    if (/\r\n|\r|\n|\f|\u000B/g.test(letter.letter)) {
      line.push({ letter: '', style: {} });
      lines.push(line);
      line = [];
    } else {
      line.push(letter);
    }
  });
  lines.push(line);

  let linesWithOverflow: RichTextLetter[][] = [];
  // step 2: iterate over the lines
  // check if there is any width overflow
  // if so, split the line into multiple lines
  // after letter is split, add it to the next line
  // reset usedLineWidth to 0
  linesWithOverflow = await getSplittedRichtTextLines(lines, schema, font, _cache);

  return linesWithOverflow;
};

// --------------------------------------------
