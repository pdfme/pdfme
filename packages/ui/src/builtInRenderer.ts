import { barcodeSchemaTypes } from '@pdfme/common';
import type { Renderer } from './types';
import { renderText } from './renders/text';
import { renderImage } from './renders/image';
import { renderBarcode } from './renders/barcodes';

const renderer: Renderer = {
    text: { render: renderText, },
    image: { render: renderImage, },
    ...barcodeSchemaTypes.reduce((acc, barcodeType) => Object.assign(acc, {
        [barcodeType]: { render: renderBarcode }
    }), {}),
}
export default renderer