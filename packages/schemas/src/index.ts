import multiVariableText from './multiVariableText/index.js';
import text, { readOnlyText } from './text/index.js';
import image, { readOnlyImage } from './graphics/image.js';
import svg, { readOnlySvg } from './graphics/svg.js';
import barcodes from './barcodes/index.js';
import line from './shapes/line.js';
import table from './tables/index.js';
import { getDynamicHeightsForTable } from './tables/dynamicTemplate.js';
import { rectangle, ellipse } from './shapes/rectAndEllipse.js';
import { convertForPdfLayoutProps, rotatePoint } from './utils.js';

const tableBeta = table;

const builtInPlugins = { Text: text };

export {
  // TODO remove
  readOnlyText,
  readOnlyImage,
  readOnlySvg,
  // schemas
  multiVariableText,
  text,
  image,
  svg,
  barcodes,
  line,
  tableBeta,
  table,
  rectangle,
  ellipse,
  // utils
  builtInPlugins,
  getDynamicHeightsForTable,
  convertForPdfLayoutProps,
  rotatePoint,
};
