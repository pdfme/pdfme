import type { Renderer, Render } from './types';
import { text, image, barcodes } from '@pdfme/schemas';

const renderer: Renderer = {
  text: text.ui as Render,
  image: image.ui as Render,
  ...Object.entries(barcodes).reduce(
    (acc, [type, barcode]) => Object.assign(acc, { [type]: barcode.ui as Render }),
    {}
  ),
};
export default renderer;
