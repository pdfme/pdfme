import { setCharacterSpacing, } from '@pdfme/pdf-lib';
import {
  TextSchema,
  Font,
  DEFAULT_FONT_SIZE,
  DEFAULT_ALIGNMENT,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_FONT_COLOR,
  calculateDynamicFontSize,
  heightOfFontAtSize,
  getFontKitFont,
  getSplittedLines,
  widthOfTextAtSize,
  FontWidthCalcValues,
  getDefaultFont,
  getFallbackFontName,
} from '@pdfme/common';
import type { RenderProps } from "../types"
import { embedAndGetFontObj } from '../pdfUtils'
import {
  hex2RgbColor,
  calcX,
  calcY,
  renderBackgroundColor,
  convertSchemaDimensionsToPt
} from '../renderUtils'

const getFontProp = async ({ input, font, schema }: { input: string, font: Font, schema: TextSchema }) => {
  const size = schema.dynamicFontSize ? await calculateDynamicFontSize({ textSchema: schema, font, input }) : schema.fontSize ?? DEFAULT_FONT_SIZE;
  const color = hex2RgbColor(schema.fontColor ?? DEFAULT_FONT_COLOR);
  const alignment = schema.alignment ?? DEFAULT_ALIGNMENT;
  const lineHeight = schema.lineHeight ?? DEFAULT_LINE_HEIGHT;
  const characterSpacing = schema.characterSpacing ?? DEFAULT_CHARACTER_SPACING;

  return { size, color, alignment, lineHeight, characterSpacing };
};

const textRenderer = async (arg: RenderProps) => {
  const { input, pdfDoc, page, options } = arg;
  const templateSchema = arg.templateSchema as TextSchema;

  const { font = getDefaultFont() } = options;

  const [pdfFontObj, fontKitFont, fontProp] = await Promise.all([
    embedAndGetFontObj({ pdfDoc, font }),
    getFontKitFont(templateSchema, font),
    getFontProp({ input, font, schema: templateSchema })
  ])

  const { size, color, alignment, lineHeight, characterSpacing } = fontProp;

  const pdfFontValue = pdfFontObj[templateSchema.fontName ? templateSchema.fontName : getFallbackFontName(font)];

  const pageHeight = page.getHeight();
  renderBackgroundColor({ templateSchema, page, pageHeight });

  const { width, height, rotate } = convertSchemaDimensionsToPt(templateSchema);

  page.pushOperators(setCharacterSpacing(characterSpacing));

  let beforeLineOver = 0;

  const fontWidthCalcValues: FontWidthCalcValues = {
    font: fontKitFont,
    fontSize: size,
    characterSpacing,
    boxWidthInPt: width,
  };

  input.split(/\r|\n|\r\n/g).forEach((inputLine, inputLineIndex) => {
    const splitLines = getSplittedLines(inputLine, fontWidthCalcValues);

    const renderLine = (line: string, lineIndex: number) => {
      const textWidth = widthOfTextAtSize(line, fontKitFont, size, characterSpacing);
      const textHeight = heightOfFontAtSize(fontKitFont, size);

      page.drawText(line, {
        x: calcX(templateSchema.position.x, alignment, width, textWidth),
        y:
          calcY(templateSchema.position.y, pageHeight, height) +
          height -
          textHeight -
          lineHeight * size * (inputLineIndex + lineIndex + beforeLineOver) -
          (lineHeight === 0 ? 0 : ((lineHeight - 1) * size) / 2),
        rotate,
        size,
        color,
        lineHeight: lineHeight * size,
        maxWidth: width,
        font: pdfFontValue,
        wordBreaks: [''],
      });
      if (splitLines.length === lineIndex + 1) beforeLineOver += lineIndex;
    };

    splitLines.forEach(renderLine);
  });
};

export default textRenderer;