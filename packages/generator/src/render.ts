import {
  PDFPage,
  PDFDocument,
  degrees,
  setCharacterSpacing,
} from '@pdfme/pdf-lib';
import {
  validateBarcodeInput,
  Schema,
  TextSchema,
  isTextSchema,
  ImageSchema,
  isImageSchema,
  BarcodeSchema,
  isBarcodeSchema,
  Font,
  BarCodeType,
  Alignment,
  DEFAULT_FONT_SIZE,
  DEFAULT_ALIGNMENT,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_FONT_COLOR,
  calculateDynamicFontSize,
  heightOfFontAtSize,
  getFontKitFont,
  getSplittedLines,
  mm2pt,
  widthOfTextAtSize,
  FontWidthCalcValues,
} from '@pdfme/common';
import type { InputImageCache, FontSetting } from "./types"
import { createBarCode } from "./barCodeUtils"
import { hex2RgbColor } from "./colorUtils"


const convertSchemaDimensionsToPt = (schema: Schema) => {
  const width = mm2pt(schema.width);
  const height = mm2pt(schema.height);
  const rotate = degrees(schema.rotate ? schema.rotate : 0);

  return { width, height, rotate };
};

const getFontProp = async ({ input, font, schema }: { input: string, font: Font, schema: TextSchema }) => {
  const size = schema.dynamicFontSize ? await calculateDynamicFontSize({ textSchema: schema, font, input }) : schema.fontSize ?? DEFAULT_FONT_SIZE;
  const color = hex2RgbColor(schema.fontColor ?? DEFAULT_FONT_COLOR);
  const alignment = schema.alignment ?? DEFAULT_ALIGNMENT;
  const lineHeight = schema.lineHeight ?? DEFAULT_LINE_HEIGHT;
  const characterSpacing = schema.characterSpacing ?? DEFAULT_CHARACTER_SPACING;

  return { size, color, alignment, lineHeight, characterSpacing };
};

const calcX = (x: number, alignment: Alignment, boxWidth: number, textWidth: number) => {
  let addition = 0;
  if (alignment === 'center') {
    addition = (boxWidth - textWidth) / 2;
  } else if (alignment === 'right') {
    addition = boxWidth - textWidth;
  }

  return mm2pt(x) + addition;
};

const calcY = (y: number, height: number, itemHeight: number) => height - mm2pt(y) - itemHeight;

const renderBackgroundColor = (arg: {
  templateSchema: TextSchema;
  page: PDFPage;
  pageHeight: number;
}) => {
  const { templateSchema, page, pageHeight } = arg;
  if (!templateSchema.backgroundColor) return;
  const { width, height } = convertSchemaDimensionsToPt(templateSchema);
  const color = hex2RgbColor(templateSchema.backgroundColor);
  page.drawRectangle({
    x: calcX(templateSchema.position.x, 'left', width, width),
    y: calcY(templateSchema.position.y, pageHeight, height),
    width,
    height,
    color,
  });
};


const renderInputByTextSchema = async (arg: {
  input: string;
  templateSchema: TextSchema;
  pdfDoc: PDFDocument;
  page: PDFPage;
  fontSetting: FontSetting;
}) => {
  const { input, templateSchema, page, fontSetting } = arg;
  const { font, pdfFontObj, fallbackFontName } = fontSetting;

  const pdfFontValue = pdfFontObj[templateSchema.fontName ? templateSchema.fontName : fallbackFontName];
  const fontKitFont = await getFontKitFont(templateSchema, font);

  const pageHeight = page.getHeight();
  renderBackgroundColor({ templateSchema, page, pageHeight });

  const { width, height, rotate } = convertSchemaDimensionsToPt(templateSchema);
  const { size, color, alignment, lineHeight, characterSpacing } = await getFontProp({
    input,
    font,
    schema: templateSchema,
  });

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

const getCacheKey = (templateSchema: Schema, input: string) => `${templateSchema.type}${input}`;

const renderInputByImageSchema = async (arg: {
  input: string;
  templateSchema: ImageSchema;
  pdfDoc: PDFDocument;
  page: PDFPage;
  inputImageCache: InputImageCache;
}) => {
  const { input, templateSchema, pdfDoc, page, inputImageCache } = arg;

  const { width, height, rotate } = convertSchemaDimensionsToPt(templateSchema);
  const opt = {
    x: calcX(templateSchema.position.x, 'left', width, width),
    y: calcY(templateSchema.position.y, page.getHeight(), height),
    rotate,
    width,
    height,
  };
  const inputImageCacheKey = getCacheKey(templateSchema, input);
  let image = inputImageCache[inputImageCacheKey];
  if (!image) {
    const isPng = input.startsWith('data:image/png;');
    image = await (isPng ? pdfDoc.embedPng(input) : pdfDoc.embedJpg(input));
  }
  inputImageCache[inputImageCacheKey] = image;
  page.drawImage(image, opt);
};

const renderInputByBarcodeSchema = async (arg: {
  input: string;
  templateSchema: BarcodeSchema;
  pdfDoc: PDFDocument;
  page: PDFPage;
  inputImageCache: InputImageCache;
}) => {
  const { input, templateSchema, pdfDoc, page, inputImageCache } = arg;
  if (!validateBarcodeInput(templateSchema.type as BarCodeType, input)) return;

  const { width, height, rotate } = convertSchemaDimensionsToPt(templateSchema);
  const opt = {
    x: calcX(templateSchema.position.x, 'left', width, width),
    y: calcY(templateSchema.position.y, page.getHeight(), height),
    rotate,
    width,
    height,
  };
  const inputBarcodeCacheKey = getCacheKey(templateSchema, input);
  let image = inputImageCache[inputBarcodeCacheKey];
  if (!image) {
    const imageBuf = await createBarCode(
      Object.assign(templateSchema, { type: templateSchema.type as BarCodeType, input })
    );
    image = await pdfDoc.embedPng(imageBuf);
  }
  inputImageCache[inputBarcodeCacheKey] = image;
  page.drawImage(image, opt);
};

export const renderInputByTemplateSchema = async (arg: {
  input: string;
  templateSchema: Schema;
  pdfDoc: PDFDocument;
  page: PDFPage;
  fontSetting: FontSetting;
  inputImageCache: InputImageCache;
}) => {
  if (!arg.input || !arg.templateSchema) return;

  if (isTextSchema(arg.templateSchema)) {
    const templateSchema = arg.templateSchema as TextSchema;
    await renderInputByTextSchema({ ...arg, templateSchema });
  } else if (isImageSchema(arg.templateSchema)) {
    const templateSchema = arg.templateSchema as ImageSchema;
    await renderInputByImageSchema({ ...arg, templateSchema });
  } else if (isBarcodeSchema(arg.templateSchema)) {
    const templateSchema = arg.templateSchema as BarcodeSchema;
    await renderInputByBarcodeSchema({ ...arg, templateSchema });
  }
};