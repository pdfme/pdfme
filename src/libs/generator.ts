import {
  PDFPage,
  PDFFont,
  PDFDocument,
  PDFEmbeddedPage,
  rgb,
  degrees,
  setCharacterSpacing,
  StandardFonts,
  TransformationMatrix,
} from 'pdf-lib';
import { uniq, getB64BasePdf, mm2pt } from './utils';
import { createBarCode, validateBarcodeInput } from './barcode';
import {
  isPageSize,
  isSubsetFont,
  TemplateSchema,
  Schemas,
  Font,
  BasePdf,
  BarCodeType,
  InputImageCache,
  Alignment,
} from './type';
import { barcodeList } from './constants';

type EmbedPdfBox = {
  mediaBox: { x: number; y: number; width: number; height: number };
  bleedBox: { x: number; y: number; width: number; height: number };
  trimBox: { x: number; y: number; width: number; height: number };
};

interface FontObj {
  [key: string]: PDFFont;
}

export const checkInputs = (inputs: { [key: string]: string }[]) => {
  if (inputs.length < 1) {
    throw Error('inputs should be more than one length');
  }
};
export const checkFont = (arg: {
  font?: Font;
  defaultFontName: string | undefined;
  fontNamesInSchemas: string[];
}) => {
  const { font, defaultFontName, fontNamesInSchemas } = arg;
  if (font) {
    const fontNames = Object.keys(font);
    if (defaultFontName && !fontNames.includes(defaultFontName)) {
      throw Error(`${defaultFontName} of template.fontName is not found in font`);
    }
    if (fontNamesInSchemas.some((f) => !fontNames.includes(f))) {
      throw Error(
        `${fontNamesInSchemas
          .filter((f) => !fontNames.includes(f))
          .join()} of template.schemas is not found in font`
      );
    }
  }
};

export const getFontNamesInSchemas = (schemas: Schemas) =>
  uniq(
    schemas
      .map((s) => Object.values(s).map((v) => v.fontName))
      .reduce((acc, val) => acc.concat(val), [] as (string | undefined)[])
      .filter(Boolean) as string[]
  );

const embedFont = ({ pdfDoc, font }: { pdfDoc: PDFDocument; font: Font | undefined }) => {
  return Promise.all(
    Object.values(font ?? {}).map((v) =>
      pdfDoc.embedFont(isSubsetFont(v) ? v.data : v, {
        subset: isSubsetFont(v) ? v.subset : true,
      })
    )
  );
};

export const getFontObj = async (arg: {
  pdfDoc: PDFDocument;
  isUseMyFont: boolean;
  font: Font | undefined;
}) => {
  const { pdfDoc, isUseMyFont, font } = arg;
  const fontValues = isUseMyFont ? await embedFont({ pdfDoc, font }) : [];

  return isUseMyFont
    ? Object.keys(font ?? {}).reduce(
        (acc, cur, i) => Object.assign(acc, { [cur]: fontValues[i] }),
        {} as { [key: string]: PDFFont }
      )
    : {
        [StandardFonts.Helvetica]: await pdfDoc.embedFont(StandardFonts.Helvetica),
      };
};

export const getEmbeddedPagesAndEmbedPdfBoxes = async (arg: {
  pdfDoc: PDFDocument;
  basePdf: BasePdf;
}) => {
  const { pdfDoc, basePdf } = arg;
  const isBlank = isPageSize(basePdf);
  let embeddedPages: PDFEmbeddedPage[] = [];
  let embedPdfBoxes: EmbedPdfBox[] = [];
  if (!isBlank) {
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
  }

  return { embeddedPages, embedPdfBoxes };
};

const getSchemaSizeAndRotate = (schema: TemplateSchema) => {
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

const hex2RgbColor = (hexString: string) => {
  const [r, g, b] = hex2rgb(hexString);

  return rgb(r / 255, g / 255, b / 255);
};

const getFontProp = (schema: TemplateSchema) => {
  const size = schema.fontSize || 13;
  const color = hex2RgbColor(schema.fontColor || '#000');
  const alignment = schema.alignment || 'left';
  const lineHeight = schema.lineHeight || 1;
  const characterSpacing = schema.characterSpacing || 0;

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
  templateSchema: TemplateSchema;
  page: PDFPage;
  pageHeight: number;
}) => {
  const { templateSchema, page, pageHeight } = arg;
  if (templateSchema.backgroundColor) {
    const { width, height } = getSchemaSizeAndRotate(templateSchema);
    page.drawRectangle({
      x: calcX(templateSchema.position.x, 'left', width, width),
      y: calcY(templateSchema.position.y, pageHeight, height),
      width,
      height,
      color: hex2RgbColor(templateSchema.backgroundColor),
    });
  }
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

const drawInputByTextSchema = (arg: {
  input: string;
  templateSchema: TemplateSchema;
  pdfDoc: PDFDocument;
  page: PDFPage;
  pageHeight: number;
  textSchemaSetting: {
    isUseMyFont: boolean;
    fontObj: FontObj;
    defaultFontName: string;
    splitThreshold: number;
  };
}) => {
  const { input, templateSchema, page, pageHeight, textSchemaSetting } = arg;
  const { isUseMyFont, fontObj, defaultFontName, splitThreshold } = textSchemaSetting;
  if (templateSchema.type !== 'text') {
    throw Error(`drawInputByTextSchema can't use ${templateSchema.type} type schema`);
  }

  const fontValue = isUseMyFont
    ? fontObj[templateSchema.fontName ? templateSchema.fontName : defaultFontName]
    : fontObj[StandardFonts.Helvetica];

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

const drawInputByImageSchema = async (arg: {
  input: string;
  templateSchema: TemplateSchema;
  pageHeight: number;
  pdfDoc: PDFDocument;
  page: PDFPage;
  inputImageCache: InputImageCache;
}) => {
  const { input, templateSchema, pageHeight, pdfDoc, page, inputImageCache } = arg;
  if (templateSchema.type !== 'image') {
    throw Error(`drawInputByImageSchema can't use ${templateSchema.type} type schema`);
  }

  const { width, height, rotate } = getSchemaSizeAndRotate(templateSchema);
  const opt = {
    x: calcX(templateSchema.position.x, 'left', width, width),
    y: calcY(templateSchema.position.y, pageHeight, height),
    rotate,
    width,
    height,
  };
  const inputImageCacheKey = `${templateSchema.type}${input}`;
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
  templateSchema: TemplateSchema;
  pageHeight: number;
  pdfDoc: PDFDocument;
  page: PDFPage;
  inputImageCache: InputImageCache;
}) => {
  const { input, templateSchema, pageHeight, pdfDoc, page, inputImageCache } = arg;
  const inValidSchemaType = !(barcodeList as string[]).includes(templateSchema.type);
  if (inValidSchemaType) {
    throw Error(`drawInputByBarcodeSchema can't use ${templateSchema.type} type schema`);
  }

  const { width, height, rotate } = getSchemaSizeAndRotate(templateSchema);
  const opt = {
    x: calcX(templateSchema.position.x, 'left', width, width),
    y: calcY(templateSchema.position.y, pageHeight, height),
    rotate,
    width,
    height,
  };
  const inputImageCacheKey = `${templateSchema.type}${input}`;
  let image = inputImageCache[inputImageCacheKey];
  if (!image && validateBarcodeInput(templateSchema.type as BarCodeType, input)) {
    const imageBuf = await createBarCode({
      ...{ ...templateSchema, type: templateSchema.type as BarCodeType },
      input,
    });
    if (imageBuf) {
      image = await pdfDoc.embedPng(imageBuf);
    }
  }
  inputImageCache[inputImageCacheKey] = image;
  page.drawImage(image, opt);
};

export const drawInputByTemplateSchema = async (arg: {
  input: string;
  templateSchema: TemplateSchema;
  pdfDoc: PDFDocument;
  page: PDFPage;
  pageHeight: number;
  textSchemaSetting: {
    isUseMyFont: boolean;
    fontObj: FontObj;
    defaultFontName: string;
    splitThreshold: number;
  };
  inputImageCache: InputImageCache;
}) => {
  const { templateSchema, input } = arg;
  if (!templateSchema) return;
  if (!input) return;

  if (templateSchema.type === 'text') {
    drawInputByTextSchema(arg);
  } else if (templateSchema.type === 'image') {
    await drawInputByImageSchema(arg);
  } else if (barcodeList.includes(templateSchema.type)) {
    await drawInputByBarcodeSchema(arg);
  }
};

export const getPageSize = (arg: { embeddedPage: PDFEmbeddedPage; basePdf: BasePdf }) => {
  const { embeddedPage, basePdf } = arg;
  const pageWidth = isPageSize(basePdf) ? mm2pt(basePdf.width) : embeddedPage.width;
  const pageHeight = isPageSize(basePdf) ? mm2pt(basePdf.height) : embeddedPage.height;

  return { pageWidth, pageHeight };
};

export const drawEmbeddedPage = (arg: {
  page: PDFPage;
  basePdf: BasePdf;
  embeddedPage: PDFEmbeddedPage;
  embedPdfBox: EmbedPdfBox;
}) => {
  const { page, basePdf, embeddedPage, embedPdfBox } = arg;
  if (!isPageSize(basePdf)) {
    page.drawPage(embeddedPage);
    const { mediaBox: mb, bleedBox: bb, trimBox: tb } = embedPdfBox;
    page.setMediaBox(mb.x, mb.y, mb.width, mb.height);
    page.setBleedBox(bb.x, bb.y, bb.width, bb.height);
    page.setTrimBox(tb.x, tb.y, tb.width, tb.height);
  }
};
