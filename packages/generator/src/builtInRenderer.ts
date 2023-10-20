import type { PDFRenderer, PDFRender } from '@pdfme/common';
import { text, image } from '@pdfme/schemas';

const renderer: PDFRenderer = { text: text.pdf as PDFRender, image: image.pdf as PDFRender };
export default renderer;
