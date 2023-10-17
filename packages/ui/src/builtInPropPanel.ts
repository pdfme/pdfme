import { PropPanel, Schema } from '@pdfme/common';
import { text, image, barcodes } from "@pdfme/schemas"
import { PropPanelObject } from './types';

const propPanel: PropPanelObject = {
    text: text.propPanel,
    image: image.propPanel,
    ...Object.entries(barcodes).reduce((acc, [type, barcode]) => Object.assign(acc, { [type]: barcode.propPanel }), {} as Record<string, PropPanel<Schema>>)
}
export default propPanel