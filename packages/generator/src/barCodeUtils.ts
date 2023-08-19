import { BarCodeType, b64toUint8Array } from '@pdfme/common';
import bwipjs, { ToBufferOptions } from 'bwip-js';
import { Buffer } from 'buffer';

const barCodeType2Bcid = (type: BarCodeType) => (type === 'nw7' ? 'rationalizedCodabar' : type);
export const createBarCode = async (arg: {
    type: BarCodeType;
    input: string;
    width: number;
    height: number;
    backgroundColor?: string;
}): Promise<Buffer> => {
    const { type, input, width, height, backgroundColor } = arg;
    const bcid = barCodeType2Bcid(type);
    const includetext = true;
    const scale = 5;
    const bwipjsArg: ToBufferOptions = { bcid, text: input, width, height, scale, includetext };

    if (backgroundColor) {
        bwipjsArg.backgroundcolor = backgroundColor;
    }

    let res: Buffer;

    if (typeof window !== 'undefined') {
        const canvas = document.createElement('canvas');
        bwipjs.toCanvas(canvas, bwipjsArg);
        const dataUrl = canvas.toDataURL('image/png');
        res = b64toUint8Array(dataUrl).buffer as Buffer;
    } else {
        res = await bwipjs.toBuffer(bwipjsArg);
    }

    return res;
};