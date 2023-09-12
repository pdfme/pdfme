import { b64toUint8Array, validateBarcodeInput, BarCodeType } from '@pdfme/common';
import type { RenderProps } from "../types"
import { calcX, calcY, convertSchemaDimensionsToPt, getCacheKey } from '../renderUtils'
import bwipjs, { ToBufferOptions } from 'bwip-js';
import { Buffer } from 'buffer';


export const createBarCode = async (arg: {
    type: BarCodeType;
    input: string;
    width: number;
    height: number;
    backgroundColor?: string;
}): Promise<Buffer> => {
    const { type, input, width, height, backgroundColor } = arg;
    const bcid = type === 'nw7' ? 'rationalizedCodabar' : type;
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

export const barcodeRender = async (arg: RenderProps) => {
    const { input, templateSchema, pdfDoc, page, _cache } = arg;
    if (!validateBarcodeInput(templateSchema.type as BarCodeType, input)) return;

    const { width, height, rotate } = convertSchemaDimensionsToPt(templateSchema);
    const opt = {
        x: calcX(templateSchema.position.x, 'left', width, width),
        y: calcY(templateSchema.position.y, page.getHeight(), height),
        rotate,
        width,
        height,
    };
    const inputBarcodeCacheKey = getCacheKey(templateSchema, input);
    let image = _cache.get(inputBarcodeCacheKey);
    if (!image) {
        const imageBuf = await createBarCode(
            Object.assign(templateSchema, { type: templateSchema.type as BarCodeType, input })
        );
        image = await pdfDoc.embedPng(imageBuf);
        _cache.set(inputBarcodeCacheKey, image)
    }

    page.drawImage(image, opt);
}