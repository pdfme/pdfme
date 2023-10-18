import { PropPanelObject } from './types';
import { text, image, barcodes } from '@pdfme/schemas';

const propPanel: PropPanelObject = {
  text: text.propPanel,
  image: image.propPanel,
  ...Object.entries(barcodes).reduce(
    (acc, [type, barcode]) => Object.assign(acc, { [type]: barcode.propPanel }),
    {}
  ),
};
export default propPanel;
