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
} from 'pdf-lib';
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
  DEFAULT_FONT_SIZE,
  DEFAULT_ALIGNMENT,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_FONT_COLOR,
} from '@pdfme/common';

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
    Object.values(font).map((v) =>
      pdfDoc.embedFont(v.data, {
        subset: typeof v.subset === 'undefined' ? true : v.subset,
      })
    )
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

const mm2pt = (mm: number): number => {
  // https://www.ddc.co.jp/words/archives/20090701114500.html
  const ptRatio = 2.8346;

  return parseFloat(String(mm)) * ptRatio;
};

const getSchemaSizeAndRotate = (schema: Schema) => {
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

const getFontProp = (schema: TextSchema) => {
  const size = schema.fontSize ?? DEFAULT_FONT_SIZE;
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

const drawBackgroundColor = (arg: {
  templateSchema: TextSchema;
  page: PDFPage;
  pageHeight: number;
}) => {
  const { templateSchema, page, pageHeight } = arg;
  if (!templateSchema.backgroundColor) return;
  const { width, height } = getSchemaSizeAndRotate(templateSchema);
  const color = hex2RgbColor(templateSchema.backgroundColor);
  page.drawRectangle({
    x: calcX(templateSchema.position.x, 'left', width, width),
    y: calcY(templateSchema.position.y, pageHeight, height),
    width,
    height,
    color,
  });
};

type IsOverEval = (testString: string) => boolean;
/**
 * Incrementally check the current line for it's real length
 * and return the position where it exceeds the box width.
 *
 * return `null` to indicate if inputLine is shorter as the available bbox
 */
const getOverPosition = (inputLine: string, isOverEval: IsOverEval) => {
  for (let i = 0; i <= inputLine.length; i += 1) {
    if (isOverEval(inputLine.substr(0, i))) {
      return i;
    }
  }

  return null;
};

/**
 * Get position of the split. Split the exceeding line at
 * the last whitespace over it exceeds the bounding box width.
 */
const getSplitPosition = (inputLine: string, isOverEval: IsOverEval) => {
  const overPos = getOverPosition(inputLine, isOverEval);
  /**
   * if input line is shorter as the available space. We split at the end of the line
   */
  if (overPos === null) return inputLine.length;
  let overPosTmp = overPos;
  while (inputLine[overPosTmp] !== ' ' && overPosTmp >= 0) overPosTmp -= 1;
  /**
   * for very long lines with no whitespace use the original overPos and
   * split one char over so we do not overfill the box
   */

  return overPosTmp > 0 ? overPosTmp : overPos - 1;
};

/**
 * recursively split the line at getSplitPosition.
 * If there is some leftover, split the rest again in the same manner.
 */
const getSplittedLines = (inputLine: string, isOverEval: IsOverEval): string[] => {
  const splitPos = getSplitPosition(inputLine, isOverEval);
  const splittedLine = inputLine.substr(0, splitPos);
  const rest = inputLine.slice(splitPos).trimLeft();
  /**
   * end recursion if there is no rest, return single splitted line in an array
   * so we can join them over the recursion
   */
  if (rest.length === 0) {
    return [splittedLine];
  }

  return [splittedLine, ...getSplittedLines(rest, isOverEval)];
};

interface TextSchemaSetting {
  fontObj: {
    [key: string]: PDFFont;
  };
  fallbackFontName: string;
  splitThreshold: number;
}

const drawInputByTextSchema = (arg: {
  input: string;
  templateSchema: TextSchema;
  pdfDoc: PDFDocument;
  page: PDFPage;
  pageHeight: number;
  textSchemaSetting: TextSchemaSetting;
}) => {
  const { input, templateSchema, page, pageHeight, textSchemaSetting } = arg;
  const { fontObj, fallbackFontName, splitThreshold } = textSchemaSetting;

  const fontValue = fontObj[templateSchema.fontName ? templateSchema.fontName : fallbackFontName];

  drawBackgroundColor({ templateSchema, page, pageHeight });

  const { width, rotate } = getSchemaSizeAndRotate(templateSchema);
  const { size, color, alignment, lineHeight, characterSpacing } = getFontProp(templateSchema);
  page.pushOperators(setCharacterSpacing(characterSpacing));

  let beforeLineOver = 0;

  input.split(/\r|\n|\r\n/g).forEach((inputLine, inputLineIndex) => {
    const isOverEval = (testString: string) => {
      const testStringWidth =
        fontValue.widthOfTextAtSize(testString, size) + (testString.length - 1) * characterSpacing;
      /**
       * split if the difference is less then two pixel
       * (found out / tested this threshold heuristically, most probably widthOfTextAtSize is unprecise)
       **/

      return width - testStringWidth <= splitThreshold;
    };
    const splitedLines = getSplittedLines(inputLine, isOverEval);
    const drawLine = (splitedLine: string, splitedLineIndex: number) => {
      const textWidth =
        fontValue.widthOfTextAtSize(splitedLine, size) +
        (splitedLine.length - 1) * characterSpacing;
      page.drawText(splitedLine, {
        x: calcX(templateSchema.position.x, alignment, width, textWidth),
        y:
          calcY(templateSchema.position.y, pageHeight, size) -
          lineHeight * size * (inputLineIndex + splitedLineIndex + beforeLineOver) -
          (lineHeight === 0 ? 0 : ((lineHeight - 1) * size) / 2),
        rotate,
        size,
        color,
        lineHeight: lineHeight * size,
        maxWidth: width,
        font: fontValue,
        wordBreaks: [''],
      });
      if (splitedLines.length === splitedLineIndex + 1) beforeLineOver += splitedLineIndex;
    };

    splitedLines.forEach(drawLine);
  });
};

const getCacheKey = (templateSchema: Schema, input: string) => `${templateSchema.type}${input}`;

const drawInputByImageSchema = async (arg: {
  input: string;
  templateSchema: ImageSchema;
  pageHeight: number;
  pdfDoc: PDFDocument;
  page: PDFPage;
  inputImageCache: InputImageCache;
}) => {
  const { input, templateSchema, pageHeight, pdfDoc, page, inputImageCache } = arg;

  const { width, height, rotate } = getSchemaSizeAndRotate(templateSchema);
  const opt = {
    x: calcX(templateSchema.position.x, 'left', width, width),
    y: calcY(templateSchema.position.y, pageHeight, height),
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
  pageHeight: number;
  pdfDoc: PDFDocument;
  page: PDFPage;
  inputImageCache: InputImageCache;
}) => {
  const { input, templateSchema, pageHeight, pdfDoc, page, inputImageCache } = arg;
  if (!validateBarcodeInput(templateSchema.type as BarCodeType, input)) return;

  const { width, height, rotate } = getSchemaSizeAndRotate(templateSchema);
  const opt = {
    x: calcX(templateSchema.position.x, 'left', width, width),
    y: calcY(templateSchema.position.y, pageHeight, height),
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
  pageHeight: number;
  textSchemaSetting: TextSchemaSetting;
  inputImageCache: InputImageCache;
}) => {
  if (!arg.input || !arg.templateSchema) return;

  if (isTextSchema(arg.templateSchema)) {
    const templateSchema = arg.templateSchema as TextSchema;
    drawInputByTextSchema({ ...arg, templateSchema });
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
