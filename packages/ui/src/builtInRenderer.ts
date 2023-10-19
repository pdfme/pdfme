import type { UIRenderer, UIRender } from '@pdfme/common';
import { text, image, barcodes } from '@pdfme/schemas';

const renderer: UIRenderer = {
  text: text.ui as UIRender,
  image: image.ui as UIRender,
  ...Object.entries(barcodes).reduce(
    (acc, [type, barcode]) => Object.assign(acc, { [type]: barcode.ui as UIRender }),
    {}
  ),
};
export default renderer;
