import { PDFFont, PDFDocument, PDFEmbeddedPage, rgb, degrees, TransformationMatrix } from 'pdf-lib';
import bwipjs, { ToBufferOptions } from 'bwip-js';
import {
  getB64BasePdf,
  b64toUint8Array,
  Schema,
  TextSchema,
  Font,
  BasePdf,
  BarCodeType,
  Alignment,
  DEFAULT_FONT_SIZE,
  DEFAULT_ALIGNMENT,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_FONT_COLOR,
  isTextSchema,
} from '@pdfme/common';
import type { EmbedPdfBox } from '../type';

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

export const getDrawOption = (arg: { schema: Schema | TextSchema; pageHeight: number }) => {
  const { schema, pageHeight } = arg;

  const width = mm2pt(schema.width);
  const height = mm2pt(schema.height);

  const rotate = degrees(schema.rotate ? schema.rotate : 0);
  rotate.angle = rotate.angle * -1;

  const alignment = isTextSchema(schema) ? schema.alignment || 'left' : 'left';

  const x = calcX(schema.position.x, alignment, width, width);
  const y = calcY(schema.position.y, pageHeight, height);

  // TODO adjust x, y by rotate angle
  // because pdf-lib rotate from letf-top, but we rotate from center

  return { x, y, rotate, width, height };
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

export const hex2RgbColor = (hexString: string | undefined) => {
  if (hexString) {
    const [r, g, b] = hex2rgb(hexString);

    return rgb(r / 255, g / 255, b / 255);
  }

  // eslint-disable-next-line no-undefined
  return undefined;
};

export const getFontProp = (schema: TextSchema) => {
  const size = schema.fontSize ?? DEFAULT_FONT_SIZE;
  const color = hex2RgbColor(schema.fontColor ?? DEFAULT_FONT_COLOR);
  const alignment = schema.alignment ?? DEFAULT_ALIGNMENT;
  const lineHeight = schema.lineHeight ?? DEFAULT_LINE_HEIGHT;
  const characterSpacing = schema.characterSpacing ?? DEFAULT_CHARACTER_SPACING;

  return { size, color, alignment, lineHeight, characterSpacing };
};

export const calcX = (x: number, alignment: Alignment, boxWidth: number, textWidth: number) => {
  let addition = 0;
  if (alignment === 'center') {
    addition = (boxWidth - textWidth) / 2;
  } else if (alignment === 'right') {
    addition = boxWidth - textWidth;
  }

  return mm2pt(x) + addition;
};

export const calcY = (y: number, height: number, itemHeight: number) =>
  height - mm2pt(y) - itemHeight;

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
export const getSplittedLines = (inputLine: string, isOverEval: IsOverEval): string[] => {
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
