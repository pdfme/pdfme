import type { PropPanel } from './types';
import { barcodeSchemaTypes } from '@pdfme/common';
import { getTextPropPanel } from './propPanels/text';
import { getImagePropPanel } from './propPanels/image';
import { getBarcodePropPanel } from './propPanels/barcodes';

const propPanel: PropPanel = {
    text: getTextPropPanel(),
    image: getImagePropPanel(),
    ...barcodeSchemaTypes.reduce((acc, type) =>
        Object.assign(acc, {
            [type]: getBarcodePropPanel(type)
        }), {}),
}
export default propPanel