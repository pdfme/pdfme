import { PDFFont, PDFDocument } from '@pdfme/pdf-lib';
import { Font } from '@pdfme/common';

const embedAndGetFontObjCache = new WeakMap();
export const embedAndGetFontObj = async (arg: { pdfDoc: PDFDocument; font: Font }) => {
    const { pdfDoc, font } = arg;
    if (embedAndGetFontObjCache.has(pdfDoc)) {
        return embedAndGetFontObjCache.get(pdfDoc);
    }

    const fontValues = await Promise.all(
        Object.values(font).map(async (v) => {
            let fontData = v.data;
            if (typeof fontData === 'string' && fontData.startsWith('http')) {
                fontData = await fetch(fontData).then((res) => res.arrayBuffer());
            }
            return pdfDoc.embedFont(fontData, {
                subset: typeof v.subset === 'undefined' ? true : v.subset,
            });
        })
    );

    const fontObj = Object.keys(font).reduce(
        (acc, cur, i) => Object.assign(acc, { [cur]: fontValues[i] }),
        {} as { [key: string]: PDFFont }
    )

    embedAndGetFontObjCache.set(pdfDoc, fontObj);
    return fontObj;
};