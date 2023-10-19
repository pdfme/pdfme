import type { PDFRenderer, PDFRender } from '@pdfme/common';
import { text, image, barcodes } from '@pdfme/schemas';

const renderer: PDFRenderer = {
  text: text.pdf as PDFRender,
  image: image.pdf as PDFRender,
  ...Object.entries(barcodes).reduce(
    (acc, [type, barcode]) => Object.assign(acc, { [type]: barcode.pdf as PDFRender }),
    {}
  ),
};
export default renderer;
