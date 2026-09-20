import { PDFFont, PDFDocument } from '@pdfme/pdf-lib';
import { Font } from '@pdfme/common';
import { fetchRemoteFontData } from './text/helper.js';

type PdfFontCache = Record<string, Promise<PDFFont>>;

const PDF_FONT_CACHE_KEY = 'schemas-pdf-font-cache';

const getPdfFontCache = (_cache: Map<string | number, unknown>): PdfFontCache => {
  let pdfFontCache = _cache.get(PDF_FONT_CACHE_KEY) as PdfFontCache | undefined;
  if (!pdfFontCache) {
    pdfFontCache = {};
    _cache.set(PDF_FONT_CACHE_KEY, pdfFontCache);
  }

  return pdfFontCache;
};

export const embedAndGetFont = (arg: {
  pdfDoc: PDFDocument;
  font: Font;
  fontName: string;
  _cache: Map<string | number, unknown>;
}) => {
  const { pdfDoc, font, fontName, _cache } = arg;
  const pdfFontCache = getPdfFontCache(_cache);
  const cachedFont = pdfFontCache[fontName];
  if (cachedFont) {
    return cachedFont;
  }

  const fontValue = font[fontName];
  if (!fontValue) {
    return Promise.reject(new Error(`[@pdfme/schemas] Font "${fontName}" is not found.`));
  }

  const pdfFontPromise = (async () => {
    let fontData = fontValue.data;
    if (typeof fontData === 'string' && fontData.startsWith('http')) {
      fontData = await fetchRemoteFontData(fontData);
    }
    return pdfDoc.embedFont(fontData, {
      subset: typeof fontValue.subset === 'undefined' ? true : fontValue.subset,
    });
  })();

  pdfFontCache[fontName] = pdfFontPromise;
  return pdfFontPromise;
};
