import { text } from '@pdfme/schemas';
import type { PDFRenderer, PDFRender } from './types';

const renderer: PDFRenderer = { text: text.pdf as PDFRender };
export default renderer;
