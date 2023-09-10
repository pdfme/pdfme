import type { Renderer } from '../types';
import textRenderer from './textRenderer';
import imageRenderer from './imageRenderer';
import barcodeRenderer from './barcodeRenderers';
import { BarCodeType } from '@pdfme/common';

const barCodeTypes: BarCodeType[] = ['qrcode', 'japanpost', 'ean13', 'ean8', 'code39', 'code128', 'nw7', 'itf14', 'upca', 'upce', 'gs1datamatrix']

const renderer: Renderer = {
    text: { renderer: textRenderer, },
    image: { renderer: imageRenderer, },
    ...barCodeTypes.reduce((acc, barcodeType) => Object.assign(acc, { [barcodeType]: { renderer: barcodeRenderer } }), {}),
}
export default renderer