import { Schema, } from '@pdfme/common';
import { createBarCode } from "../barCodeUtils"
import { validateBarcodeInput, BarCodeType } from '@pdfme/common';
import type { InputImageCache, RenderProps } from "../types"
import { calcX, calcY, convertSchemaDimensionsToPt } from '../renderUtils'


const inputImageCache: InputImageCache = {};
const getCacheKey = (templateSchema: Schema, input: string) => `${templateSchema.type}${input}`;

const barcodeRenderer = async (arg: RenderProps) => {
    const { input, templateSchema, pdfDoc, page } = arg;
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
    let image = inputImageCache[inputBarcodeCacheKey];
    if (!image) {
        const imageBuf = await createBarCode(
            Object.assign(templateSchema, { type: templateSchema.type as BarCodeType, input })
        );
        image = await pdfDoc.embedPng(imageBuf);
    }
    inputImageCache[inputBarcodeCacheKey] = image;
    page.drawImage(image, opt);
};

export default barcodeRenderer;