import {
  PDFPage,
  PDFFont,
  PDFImage,
  PDFDocument,
  PDFEmbeddedPage,
  rgb,
  degrees,
  setCharacterSpacing,
  StandardFonts,
  TransformationMatrix,
} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { uniq, hex2rgb, mm2pt, calcX, calcY, getSplittedLines, getB64BasePdf } from './libs/utils';
import { createBarCode, validateBarcodeInput } from './libs/barcode';
import {
  Args,
  isPageSize,
  isSubsetFont,
  TemplateSchema,
  Schemas,
  Font,
  BasePdf,
  BarCodeType,
} from './libs/type';
import { barcodeList } from './libs/constants';

type EmbedPdfBox = {
  mediaBox: { x: number; y: number; width: number; height: number };
  bleedBox: { x: number; y: number; width: number; height: number };
  trimBox: { x: number; y: number; width: number; height: number };
};

interface InputImageCache {
  [key: string]: PDFImage;
}
interface FontObj {
  [key: string]: PDFFont;
}

const getFontNamesInSchemas = (schemas: Schemas) =>
  uniq(
    schemas
      .map((s) => Object.values(s).map((v) => v.fontName))
      .reduce((acc, val) => acc.concat(val), [] as (string | undefined)[])
      .filter(Boolean) as string[]
  );

const checkFont = (arg: {
  font?: Font;
  templateFontName: string | undefined;
  fontNamesInSchemas: string[];
}) => {
  const { font, templateFontName, fontNamesInSchemas } = arg;
  if (font) {
    const fontNames = Object.keys(font);
    if (templateFontName && !fontNames.includes(templateFontName)) {
      throw Error(`${templateFontName} of template.fontName is not found in font`);
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

const embedFont = ({ pdfDoc, font }: { pdfDoc: PDFDocument; font: Font | undefined }) => {
  return Promise.all(
    Object.values(font ?? {}).map((v) =>
      pdfDoc.embedFont(isSubsetFont(v) ? v.data : v, {
        subset: isSubsetFont(v) ? v.subset : true,
      })
    )
  );
};

const getFontObj = async (arg: {
  pdfDoc: PDFDocument;
  isUseMyfont: boolean;
  font: Font | undefined;
}) => {
  const { pdfDoc, isUseMyfont, font } = arg;
  const fontValues = isUseMyfont ? await embedFont({ pdfDoc, font }) : [];

  return isUseMyfont
    ? Object.keys(font ?? {}).reduce(
        (acc, cur, i) => Object.assign(acc, { [cur]: fontValues[i] }),
        {} as { [key: string]: PDFFont }
      )
    : {
        [StandardFonts.Helvetica]: await pdfDoc.embedFont(StandardFonts.Helvetica),
      };
};

const getEmbeddedPagesAndEmbedPdfBoxes = async (arg: { pdfDoc: PDFDocument; basePdf: BasePdf }) => {
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

const drawBackgroundColor = ({
  schema,
  page,
  pageHeight,
}: {
  schema: TemplateSchema;
  page: PDFPage;
  pageHeight: number;
}) => {
  if (schema.backgroundColor) {
    const { width, height } = getSchemaSizeAndRotate(schema);
    page.drawRectangle({
      x: calcX(schema.position.x, 'left', width, width),
      y: calcY(schema.position.y, pageHeight, height),
      width,
      height,
      color: hex2RgbColor(schema.backgroundColor),
    });
  }
};

const drawInputByTextSchema = (arg: {
  input: string;
  schema: TemplateSchema;
  pdfDoc: PDFDocument;
  page: PDFPage;
  pageHeight: number;
  textSchemaSetting: {
    isUseMyfont: boolean;
    fontObj: FontObj;
    defaultFontName: string;
    splitThreshold: number;
  };
}) => {
  const { input, schema, page, pageHeight, textSchemaSetting } = arg;
  const { isUseMyfont, fontObj, defaultFontName, splitThreshold } = textSchemaSetting;
  if (schema.type !== 'text') {
    throw Error(`drawInputByTextSchema can't use ${schema.type} type schema`);
  }

  const fontValue = isUseMyfont
    ? fontObj[schema.fontName ? schema.fontName : defaultFontName]
    : fontObj[StandardFonts.Helvetica];

  drawBackgroundColor({ schema, page, pageHeight });

  const { width, rotate } = getSchemaSizeAndRotate(schema);
  const { size, color, alignment, lineHeight, characterSpacing } = getFontProp(schema);
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
        x: calcX(schema.position.x, alignment, width, textWidth),
        y:
          calcY(schema.position.y, pageHeight, size) -
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
  schema: TemplateSchema;
  pageHeight: number;
  pdfDoc: PDFDocument;
  page: PDFPage;
  inputImageCache: InputImageCache;
}) => {
  const { input, schema, pageHeight, pdfDoc, page, inputImageCache } = arg;
  if (schema.type !== 'image') {
    throw Error(`drawInputByImageSchema can't use ${schema.type} type schema`);
  }

  const { width, height, rotate } = getSchemaSizeAndRotate(schema);
  const opt = {
    x: calcX(schema.position.x, 'left', width, width),
    y: calcY(schema.position.y, pageHeight, height),
    rotate,
    width,
    height,
  };
  const inputImageCacheKey = `${schema.type}${input}`;
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
  schema: TemplateSchema;
  pageHeight: number;
  pdfDoc: PDFDocument;
  page: PDFPage;
  inputImageCache: InputImageCache;
}) => {
  const { input, schema, pageHeight, pdfDoc, page, inputImageCache } = arg;
  const inValidSchemaType = !(barcodeList as string[]).includes(schema.type);
  if (inValidSchemaType) {
    throw Error(`drawInputByBarcodeSchema can't use ${schema.type} type schema`);
  }

  const { width, height, rotate } = getSchemaSizeAndRotate(schema);
  const opt = {
    x: calcX(schema.position.x, 'left', width, width),
    y: calcY(schema.position.y, pageHeight, height),
    rotate,
    width,
    height,
  };
  const inputImageCacheKey = `${schema.type}${input}`;
  let image = inputImageCache[inputImageCacheKey];
  if (!image && validateBarcodeInput(schema.type as BarCodeType, input)) {
    const imageBuf = await createBarCode({
      ...{ ...schema, type: schema.type as BarCodeType },
      input,
    });
    if (imageBuf) {
      image = await pdfDoc.embedPng(imageBuf);
    }
  }
  inputImageCache[inputImageCacheKey] = image;
  page.drawImage(image, opt);
};

const drawInputBySchema = async (arg: {
  input: string;
  schema: TemplateSchema;
  pdfDoc: PDFDocument;
  page: PDFPage;
  pageHeight: number;
  textSchemaSetting: {
    isUseMyfont: boolean;
    fontObj: FontObj;
    defaultFontName: string;
    splitThreshold: number;
  };
  inputImageCache: InputImageCache;
}) => {
  const { schema, input } = arg;
  if (!schema) return;
  if (!input) return;

  if (schema.type === 'text') {
    drawInputByTextSchema(arg);
  } else if (schema.type === 'image') {
    await drawInputByImageSchema(arg);
  } else if (barcodeList.includes(schema.type)) {
    await drawInputByBarcodeSchema(arg);
  }
};

const getPageSize = (arg: { embeddedPage: PDFEmbeddedPage; basePdf: BasePdf }) => {
  const { embeddedPage, basePdf } = arg;
  const pageWidth = isPageSize(basePdf) ? mm2pt(basePdf.width) : embeddedPage.width;
  const pageHeight = isPageSize(basePdf) ? mm2pt(basePdf.height) : embeddedPage.height;

  return { pageWidth, pageHeight };
};

const drawEmbeddedPage = (arg: {
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

const generate = async ({ inputs, template, font, splitThreshold = 3 }: Args) => {
  if (inputs.length < 1) {
    throw Error('inputs should be more than one length');
  }

  const { basePdf, schemas } = template;

  const fontNamesInSchemas = getFontNamesInSchemas(schemas);

  checkFont({ font, templateFontName: template.fontName, fontNamesInSchemas });
  const isUseMyfont =
    Boolean(font) && (Boolean(template.fontName) || fontNamesInSchemas.length > 0);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const fontObj = await getFontObj({ pdfDoc, isUseMyfont, font });

  const inputImageCache: InputImageCache = {};

  const pagesAndBoxes = await getEmbeddedPagesAndEmbedPdfBoxes({ pdfDoc, basePdf });
  const { embeddedPages, embedPdfBoxes } = pagesAndBoxes;

  for (let i = 0; i < inputs.length; i += 1) {
    const inputObj = inputs[i];
    const keys = Object.keys(inputObj);
    for (let j = 0; j < (isPageSize(basePdf) ? schemas : embeddedPages).length; j += 1) {
      const embeddedPage = embeddedPages[j];
      const embedPdfBox = embedPdfBoxes[j];
      const { pageWidth, pageHeight } = getPageSize({ embeddedPage, basePdf });
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      drawEmbeddedPage({ page, basePdf, embeddedPage, embedPdfBox });
      if (!schemas[j]) continue;
      for (let l = 0; l < keys.length; l += 1) {
        const key = keys[l];
        const schema = schemas[j][key];
        const input = inputObj[key];

        const defaultFontName = template.fontName ?? '';
        const textSchemaSetting = { isUseMyfont, fontObj, defaultFontName, splitThreshold };
        const arg = { input, schema, pdfDoc, page, pageHeight, textSchemaSetting, inputImageCache };
        await drawInputBySchema(arg);
      }
    }
  }
  const author = 'pdfme (https://github.com/hand-dot/pdfme)';
  pdfDoc.setProducer(author);
  pdfDoc.setCreator(author);

  const pdfBytes = await pdfDoc.save();

  return pdfBytes;
};

export default generate;
