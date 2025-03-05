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
import type { TextSchema, FontWidthCalcValues } from './types.js';
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_LINE_HEIGHT,
  FONT_SIZE_ADJUSTMENT,
  DEFAULT_DYNAMIC_FIT,
  DYNAMIC_FIT_HORIZONTAL,
  DYNAMIC_FIT_VERTICAL,
  VERTICAL_ALIGN_TOP,
  LINE_END_FORBIDDEN_CHARS,
  LINE_START_FORBIDDEN_CHARS,
} from './constants.js';

export const getBrowserVerticalFontAdjustments = (
  fontKitFont: FontKitFont,
  fontSize: number,
  lineHeight: number,
  verticalAlignment: string,
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

const calculateCharacterSpacing = (textContent: string, textCharacterSpacing: number) => {
  return (textContent.length - 1) * textCharacterSpacing;
};

export const widthOfTextAtSize = (
  text: string,
  fontKitFont: FontKitFont,
  fontSize: number,
  characterSpacing: number,
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
  _cache: Map<string | number, fontkit.Font>,
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

  // Convert fontData to Buffer if it's not already a Buffer
  let fontDataBuffer: Buffer;
  if (fontData instanceof Buffer) {
    fontDataBuffer = fontData;
  } else {
    fontDataBuffer = Buffer.from(fontData as ArrayBufferLike);
  }
  const fontKitFont = fontkit.create(fontDataBuffer) as fontkit.Font;
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
  const lineBreakableChars = [' ', '-', '\u2014', '\u2013'];
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
export const calculateDynamicFontSize = ({
  textSchema,
  fontKitFont,
  value,
  startingFontSize,
}: {
  textSchema: TextSchema;
  fontKitFont: FontKitFont;
  value: string;
  startingFontSize?: number | undefined;
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
      const lines = getSplittedLinesBySegmenter(paragraph, {
        font: fontKitFont,
        fontSize: size,
        characterSpacing,
        boxWidthInPt,
      });

      lines.forEach((line, lineIndex) => {
        if (dynamicFontFit === DYNAMIC_FIT_VERTICAL) {
          // For vertical fit we want to consider the width of text lines where we detect a split
          const textWidth = widthOfTextAtSize(
            line.replace('\n', ''),
            fontKitFont,
            size,
            characterSpacing,
          );
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
    lines = lines.concat(getSplittedLinesBySegmenter(line, fontWidthCalcValues));
  });
  return lines;
};
export const isFirefox = () => navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

const getSplittedLinesBySegmenter = (line: string, calcValues: FontWidthCalcValues): string[] => {
  // nothing to process but need to keep this for new lines.
  if (line.trim() === '') {
    return [''];
  }

  const { font, fontSize, characterSpacing, boxWidthInPt } = calcValues;
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
  const iterator = segmenter.segment(line.trimEnd())[Symbol.iterator]();

  let lines: string[] = [];
  let lineCounter: number = 0;
  let currentTextSize: number = 0;

  while (true) {
    const chunk = iterator.next();
    if (chunk.done) break;
    const segment = chunk.value.segment;
    const textWidth = widthOfTextAtSize(segment, font, fontSize, characterSpacing);
    if (currentTextSize + textWidth <= boxWidthInPt) {
      // the size of boxWidth is large enough to add the segment
      if (lines[lineCounter]) {
        lines[lineCounter] += segment;
        currentTextSize += textWidth + characterSpacing;
      } else {
        lines[lineCounter] = segment;
        currentTextSize = textWidth + characterSpacing;
      }
    } else if (segment.trim() === '') {
      // a segment can be consist of multiple spaces like '     '
      // if they overflow the box, treat them as a line break and move to the next line
      lines[++lineCounter] = '';
      currentTextSize = 0;
    } else if (textWidth <= boxWidthInPt) {
      // the segment is small enough to be added to the next line
      lines[++lineCounter] = segment;
      currentTextSize = textWidth + characterSpacing;
    } else {
      // the segment is too large to fit in the boxWidth, we wrap the segment
      for (const char of segment) {
        const size = widthOfTextAtSize(char, font, fontSize, characterSpacing);
        if (currentTextSize + size <= boxWidthInPt) {
          if (lines[lineCounter]) {
            lines[lineCounter] += char;
            currentTextSize += size + characterSpacing;
          } else {
            lines[lineCounter] = char;
            currentTextSize = size + characterSpacing;
          }
        } else {
          lines[++lineCounter] = char;
          currentTextSize = size + characterSpacing;
        }
      }
    }
  }

  if (lines.some(containsJapanese)) {
    return adjustEndOfLine(filterEndJP(filterStartJP(lines)));
  } else {
    return adjustEndOfLine(lines);
  }
};

// add a newline if the line is the end of the paragraph
const adjustEndOfLine = (lines: string[]): string[] => {
  return lines.map((line, index) => {
    if (index === lines.length - 1) {
      return line.trimEnd() + '\n';
    } else {
      return line.trimEnd();
    }
  });
};

function containsJapanese(text: string): boolean {
  return /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(text);
}
//
// 日本語禁則処理
//
// https://www.morisawa.co.jp/blogs/MVP/8760
//
// 行頭禁則
export const filterStartJP = (lines: string[]): string[] => {
  const filtered: string[] = [];
  let charToAppend: string | null = null;

  lines
    .slice()
    .reverse()
    .forEach((line) => {
      if (line.trim().length === 0) {
        filtered.push('');
      } else {
        const charAtStart: string = line.charAt(0);
        if (LINE_START_FORBIDDEN_CHARS.includes(charAtStart)) {
          if (line.trim().length === 1) {
            filtered.push(line);
            charToAppend = null;
          } else {
            if (charToAppend) {
              filtered.push(line.slice(1) + charToAppend);
            } else {
              filtered.push(line.slice(1));
            }
            charToAppend = charAtStart;
          }
        } else {
          if (charToAppend) {
            filtered.push(line + charToAppend);
            charToAppend = null;
          } else {
            filtered.push(line);
          }
        }
      }
    });

  if (charToAppend) {
    // Handle the case where filtered might be empty
    const firstItem = filtered.length > 0 ? filtered[0] : '';
    // Ensure we're concatenating strings
    const combinedItem = String(charToAppend) + String(firstItem);
    return [combinedItem, ...filtered.slice(1)].reverse();
  } else {
    return filtered.reverse();
  }
};

// 行末禁則
export const filterEndJP = (lines: string[]): string[] => {
  const filtered: string[] = [];
  let charToPrepend: string | null = null;

  lines.forEach((line) => {
    if (line.trim().length === 0) {
      filtered.push('');
    } else {
      const chartAtEnd = line.slice(-1);

      if (LINE_END_FORBIDDEN_CHARS.includes(chartAtEnd)) {
        if (line.trim().length === 1) {
          filtered.push(line);
          charToPrepend = null;
        } else {
          if (charToPrepend) {
            filtered.push(charToPrepend + line.slice(0, -1));
          } else {
            filtered.push(line.slice(0, -1));
          }
          charToPrepend = chartAtEnd;
        }
      } else {
        if (charToPrepend) {
          filtered.push(charToPrepend + line);
          charToPrepend = null;
        } else {
          filtered.push(line);
        }
      }
    }
  });

  if (charToPrepend) {
    // Handle the case where filtered might be empty
    const lastItem = filtered.length > 0 ? filtered[filtered.length - 1] : '';
    // Ensure we're concatenating strings
    const combinedItem = String(lastItem) + String(charToPrepend);
    return [...filtered.slice(0, -1), combinedItem];
  } else {
    return filtered;
  }
};
