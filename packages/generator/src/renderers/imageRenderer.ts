import { Schema, } from '@pdfme/common';
import type { InputImageCache, RenderProps } from "../types"
import { calcX, calcY, convertSchemaDimensionsToPt } from '../renderUtils'

const inputImageCache: InputImageCache = {};
const getCacheKey = (templateSchema: Schema, input: string) => `${templateSchema.type}${input}`;

const imageRenderer = async (arg: RenderProps) => {
    const { input, templateSchema, pdfDoc, page } = arg;

    const { width, height, rotate } = convertSchemaDimensionsToPt(templateSchema);
    const opt = {
        x: calcX(templateSchema.position.x, 'left', width, width),
        y: calcY(templateSchema.position.y, page.getHeight(), height),
        rotate,
        width,
        height,
    };
    const inputImageCacheKey = getCacheKey(templateSchema, input);
    let image = inputImageCache[inputImageCacheKey];
    if (!image) {
        const isPng = input.startsWith('data:image/png;');
        image = await (isPng ? pdfDoc.embedPng(input) : pdfDoc.embedJpg(input));
    }
    inputImageCache[inputImageCacheKey] = image;
    page.drawImage(image, opt);
};

export default imageRenderer;