import type { PDFRenderer, PDFRender } from '@pdfme/common';
import { text } from '@pdfme/schemas';

const renderer: PDFRenderer = { text: text.pdf as PDFRender };
export default renderer;
