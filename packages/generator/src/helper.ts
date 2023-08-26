import {
  PDFPage,
  PDFFont,
  PDFDocument,
  PDFImage,
  PDFEmbeddedPage,
  rgb,
  degrees,
  setCharacterSpacing,
  TransformationMatrix,
} from '@pdfme/pdf-lib';
import bwipjs, { ToBufferOptions } from 'bwip-js';
import {
  getB64BasePdf,
  b64toUint8Array,
  validateBarcodeInput,
  Schema,
  TextSchema,
  isTextSchema,
  ImageSchema,
  isImageSchema,
  BarcodeSchema,
  isBarcodeSchema,
  Font,
  BasePdf,
  BarCodeType,
  Alignment,
  DEFAULT_ALIGNMENT,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_FONT_COLOR,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_VERTICAL_ALIGNMENT,
  VERTICAL_ALIGN_TOP,
  VERTICAL_ALIGN_MIDDLE,
  VERTICAL_ALIGN_BOTTOM,
  calculateDynamicFontSize,
  heightOfFontAtSize,
  getFontDescentInPt,
  getFontKitFont,
  getSplittedLines,
  mm2pt,
  widthOfTextAtSize,
  FontWidthCalcValues,
} from '@pdfme/common';
import { Buffer } from 'buffer';

export interface InputImageCache {
  [key: string]: PDFImage | undefined;
}

const barCodeType2Bcid = (type: BarCodeType) => (type === 'nw7' ? 'rationalizedCodabar' : type);
export const createBarCode = async (arg: {
  type: BarCodeType;
  input: string;
  width: number;
  height: number;
  backgroundColor?: string;
}): Promise<Buffer> => {
  const { type, input, width, height, backgroundColor } = arg;
  const bcid = barCodeType2Bcid(type);
  const includetext = true;
  const scale = 5;
  const bwipjsArg: ToBufferOptions = { bcid, text: input, width, height, scale, includetext };

  if (backgroundColor) {
    bwipjsArg.backgroundcolor = backgroundColor;
  }

  let res: Buffer;

  if (typeof window !== 'undefined') {
    const canvas = document.createElement('canvas');
    bwipjs.toCanvas(canvas, bwipjsArg);
    const dataUrl = canvas.toDataURL('image/png');
    res = b64toUint8Array(dataUrl).buffer as Buffer;
  } else {
    res = await bwipjs.toBuffer(bwipjsArg);
  }

  return res;
};

type EmbedPdfBox = {
  mediaBox: { x: number; y: number; width: number; height: number };
  bleedBox: { x: number; y: number; width: number; height: number };
  trimBox: { x: number; y: number; width: number; height: number };
};

export const embedAndGetFontObj = async (arg: { pdfDoc: PDFDocument; font: Font }) => {
  const { pdfDoc, font } = arg;
  const fontValues = await Promise.all(
    Object.values(font).map(async (v) => {
      let fontData = v.data;
      if (typeof fontData === 'string' && fontData.startsWith('http')) {
        fontData = await fetch(fontData).then((res) => res.arrayBuffer());
      }
      return pdfDoc.embedFont(fontData, {
        subset: typeof v.subset === 'undefined' ? true : v.subset,
      });
    })
  );

  return Object.keys(font).reduce(
    (acc, cur, i) => Object.assign(acc, { [cur]: fontValues[i] }),
    {} as { [key: string]: PDFFont }
  );
};

export const getEmbeddedPagesAndEmbedPdfBoxes = async (arg: {
  pdfDoc: PDFDocument;
  basePdf: BasePdf;
}) => {
  const { pdfDoc, basePdf } = arg;
  let embeddedPages: PDFEmbeddedPage[] = [];
  let embedPdfBoxes: EmbedPdfBox[] = [];
  const willLoadPdf = typeof basePdf === 'string' ? await getB64BasePdf(basePdf) : basePdf;
  const embedPdf = await PDFDocument.load(willLoadPdf);
  const embedPdfPages = embedPdf.getPages();

  embedPdfBoxes = embedPdfPages.map((p) => ({
    mediaBox: p.getMediaBox(),
    bleedBox: p.getBleedBox(),
    trimBox: p.getTrimBox(),
  }));

  const boundingBoxes = embedPdfPages.map((p) => {
    const { x, y, width, height } = p.getMediaBox();

    return { left: x, bottom: y, right: width, top: height + y };
  });

  const transformationMatrices = embedPdfPages.map(
    () => [1, 0, 0, 1, 0, 0] as TransformationMatrix
  );

  embeddedPages = await pdfDoc.embedPages(embedPdfPages, boundingBoxes, transformationMatrices);

  return { embeddedPages, embedPdfBoxes };
};

const convertSchemaDimensionsToPt = (schema: Schema) => {
  const width = mm2pt(schema.width);
  const height = mm2pt(schema.height);
  const rotate = degrees(schema.rotate ? schema.rotate : 0);

  return { width, height, rotate };
};

const hex2rgb = (hex: string) => {
  if (hex.slice(0, 1) === '#') hex = hex.slice(1);
  if (hex.length === 3)
    hex =
      hex.slice(0, 1) +
      hex.slice(0, 1) +
      hex.slice(1, 2) +
      hex.slice(1, 2) +
      hex.slice(2, 3) +
      hex.slice(2, 3);

  return [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)].map((str) => parseInt(str, 16));
};

const hex2RgbColor = (hexString: string | undefined) => {
  if (hexString) {
    const [r, g, b] = hex2rgb(hexString);

    return rgb(r / 255, g / 255, b / 255);
  }

  // eslint-disable-next-line no-undefined
  return undefined;
};

const getFontProp = async ({ input, font, schema }: { input: string, font: Font, schema: TextSchema }) => {
  const fontSize = schema.dynamicFontSize ? await calculateDynamicFontSize({ textSchema: schema, font, input }) : schema.fontSize ?? DEFAULT_FONT_SIZE;
  const color = hex2RgbColor(schema.fontColor ?? DEFAULT_FONT_COLOR);
  const alignment = schema.alignment ?? DEFAULT_ALIGNMENT;
  const verticalAlignment = schema.verticalAlignment ?? DEFAULT_VERTICAL_ALIGNMENT;
  const lineHeight = schema.lineHeight ?? DEFAULT_LINE_HEIGHT;
  const characterSpacing = schema.characterSpacing ?? DEFAULT_CHARACTER_SPACING;

  return { fontSize, color, alignment, verticalAlignment, lineHeight, characterSpacing };
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

const calcY = (y: number, pageHeight: number, itemHeight: number) => pageHeight - mm2pt(y) - itemHeight;

const drawBackgroundColor = (arg: {
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

interface FontSetting {
  font: Font;
  pdfFontObj: {
    [key: string]: PDFFont;
  };
  fallbackFontName: string;
}

const drawInputByTextSchema = async (arg: {
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
  drawBackgroundColor({ templateSchema, page, pageHeight });

  const { width, height, rotate } = convertSchemaDimensionsToPt(templateSchema);
  const { fontSize, color, alignment, verticalAlignment, lineHeight, characterSpacing } =
    await getFontProp({
      input,
      font,
      schema: templateSchema,
    });

  page.pushOperators(setCharacterSpacing(characterSpacing));

  const firstLineTextHeight = heightOfFontAtSize(fontKitFont, fontSize);
  const descent = getFontDescentInPt(fontKitFont, fontSize);
  const halfLineHeightAdjustment = lineHeight === 0 ? 0 : ((lineHeight - 1) * fontSize) / 2;

  const fontWidthCalcValues: FontWidthCalcValues = {
    font: fontKitFont,
    fontSize,
    characterSpacing,
    boxWidthInPt: width,
  };

  let lines: string[] = [];
  input.split(/\r|\n|\r\n/g).forEach((inputLine) => {
    lines = lines.concat(getSplittedLines(inputLine, fontWidthCalcValues));
  });

  // Text lines are rendered from the bottom upwards, we need to adjust the position down
  let yOffset = 0;
  if (verticalAlignment === VERTICAL_ALIGN_TOP) {
    yOffset = firstLineTextHeight + halfLineHeightAdjustment;
  } else {
    const otherLinesHeight = lineHeight * fontSize * (lines.length - 1);

    if (verticalAlignment === VERTICAL_ALIGN_BOTTOM) {
      yOffset = height - otherLinesHeight + descent - halfLineHeightAdjustment;
    } else if (verticalAlignment === VERTICAL_ALIGN_MIDDLE) {
      yOffset = (height - otherLinesHeight - firstLineTextHeight + descent) / 2 + firstLineTextHeight;
    }
  }

  lines.forEach((line, rowIndex) => {
    const textWidth = widthOfTextAtSize(line, fontKitFont, fontSize, characterSpacing);
    const rowYOffset = lineHeight * fontSize * rowIndex;

    page.drawText(line, {
      x: calcX(templateSchema.position.x, alignment, width, textWidth),
      y: calcY(templateSchema.position.y, pageHeight, yOffset) - rowYOffset,
      rotate,
      size: fontSize,
      color,
      lineHeight: lineHeight * fontSize,
      maxWidth: width,
      font: pdfFontValue,
      wordBreaks: [''],
    });
  });
};

const getCacheKey = (templateSchema: Schema, input: string) => `${templateSchema.type}${input}`;

const drawInputByImageSchema = async (arg: {
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

const drawInputByBarcodeSchema = async (arg: {
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

export const drawInputByTemplateSchema = async (arg: {
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
    await drawInputByTextSchema({ ...arg, templateSchema });
  } else if (isImageSchema(arg.templateSchema)) {
    const templateSchema = arg.templateSchema as ImageSchema;
    await drawInputByImageSchema({ ...arg, templateSchema });
  } else if (isBarcodeSchema(arg.templateSchema)) {
    const templateSchema = arg.templateSchema as BarcodeSchema;
    await drawInputByBarcodeSchema({ ...arg, templateSchema });
  }
};

export const drawEmbeddedPage = (arg: {
  page: PDFPage;
  embeddedPage: PDFEmbeddedPage;
  embedPdfBox: EmbedPdfBox;
}) => {
  const { page, embeddedPage, embedPdfBox } = arg;
  page.drawPage(embeddedPage);
  const { mediaBox: mb, bleedBox: bb, trimBox: tb } = embedPdfBox;
  page.setMediaBox(mb.x, mb.y, mb.width, mb.height);
  page.setBleedBox(bb.x, bb.y, bb.width, bb.height);
  page.setTrimBox(tb.x, tb.y, tb.width, tb.height);
};
