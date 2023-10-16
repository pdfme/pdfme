import { barcodeSchemaTypes } from '@pdfme/common';
import { text, image, barcodes } from "@pdfme/schemas"
import type { Renderer } from './types';

const renderer: Renderer = {
    text: { render: text.pdf },
    image: { render: image.pdf, },
    ...barcodeSchemaTypes.reduce((acc, type) => Object.assign(acc, {
        [type]: { render: barcodes[type].pdf, }
    }), {}),
}
export default renderer