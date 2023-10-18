import type { Renderer, Render } from './types';
import { text, image, barcodes } from '@pdfme/schemas';

const renderer: Renderer = {
  text: text.pdf as Render,
  image: image.pdf as Render,
  ...Object.entries(barcodes).reduce(
    (acc, [type, barcode]) => Object.assign(acc, { [type]: barcode.pdf as Render }),
    {}
  ),
};
export default renderer;
