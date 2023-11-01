import text from './text';
import image from './image';
import barcodes from './barcodes';
import { convertForPdfLayoutProps, rotatePoint } from './renderUtils';

const builtInPlugins = { Text: text };

export { text, image, barcodes, builtInPlugins, convertForPdfLayoutProps, rotatePoint };
