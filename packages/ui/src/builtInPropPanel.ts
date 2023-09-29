import type { PropPanel } from './types';
import { barcodeSchemaTypes } from '@pdfme/common';
import { renderText } from './propPanels/text';
import { renderImage } from './propPanels/image';
import { renderBarcode } from './propPanels/barcodes';

const propPanel: PropPanel = {
    text: { render: renderText, },
    image: { render: renderImage, },
    ...barcodeSchemaTypes.reduce((acc, barcodeType) => Object.assign(acc, { [barcodeType]: { render: renderBarcode } }), {}),
}
export default propPanel