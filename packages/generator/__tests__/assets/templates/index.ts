import { Template } from '@pdfme/common';

const z97mmx210mm = require('./z97mmx210mm.json') as Template;
const barcodes = require('./barcodes.json') as Template;
const canvasPdf = require('./canvasPdf.json') as Template;
const background = require('./background.json') as Template;
const dynamicFontSizeHorizontal = require('./dynamicFontSizeHorizontal.json') as Template;
const dynamicFontSizeVertical = require('./dynamicFontSizeVertical.json') as Template;
const rotation = require('./rotation.json') as Template;
const verticalAlignmentTop = require('./verticalAlignmentTop.json') as Template;
const verticalAlignmentMiddle = require('./verticalAlignmentMiddle.json') as Template;
const verticalAlignmentBottom = require('./verticalAlignmentBottom.json') as Template;
const test = require('./test.json') as Template;
const shapes = require('./shapes.json') as Template;
const pet = require('./pet.json') as Template;
const pdfImage = require('./pdfImage.json') as Template;
const underlineStrikethrough = require('./underlineStrikethrough.json') as Template;
const multiVariableText = require('./multiVariableText.json') as Template;
const preVersion5Format = require('./preVersion5Format.json') as Template;
const segmenterEnglish = require('./segmenterEnglish.json') as Template;
const segmenterJapanese = require('./segmenterJapanese.json') as Template;

// These tests are slower, so we allow more time for them to pass
export const textType = {
  dynamicFontSizeHorizontal,
  dynamicFontSizeVertical,
  verticalAlignmentTop,
  verticalAlignmentMiddle,
  verticalAlignmentBottom,
  underlineStrikethrough,
  multiVariableText,
};

export const other = {
  barcodes,
  shapes,
  test,
  preVersion5Format,
  z97mmx210mm,
  canvasPdf,
  background,
  rotation,
  pet,
  pdfImage,
};

export const segmenter = {
  segmenterEnglish,
  segmenterJapanese,
};
