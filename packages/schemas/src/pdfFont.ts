import { PDFFont, PDFDocument } from '@pdfme/pdf-lib';
import { Font } from '@pdfme/common';
import { fetchRemoteFontData, getFontFeatures } from './text/helper.js';

const PDF_FONT_CACHE_KEY = 'schemas-pdf-font-cache';
const REMOTE_FONT_DATA_CACHE_KEY = 'schemas-remote-font-data-cache';

const getCacheRecord = <T>(_cache: Map<string | number, unknown>, key: string) => {
  let record = _cache.get(key) as Record<string, Promise<T>> | undefined;
  if (!record) {
    record = {};
    _cache.set(key, record);
  }

  return record;
};

/**
 * `characterSpacing` is the spacing (Tc) the text will be drawn with: a font embedded for
 * non-zero spacing is shaped as `widthOfTextAtSize` measures it, without optional ligatures.
 */
export const embedAndGetFont = (arg: {
  pdfDoc: PDFDocument;
  font: Font;
  fontName: string;
  _cache: Map<string | number, unknown>;
  characterSpacing?: number;
}) => {
  const { pdfDoc, font, fontName, _cache, characterSpacing = 0 } = arg;
  const features = getFontFeatures(characterSpacing);
  const cacheKey = features ? `${fontName}\0letter-spaced` : fontName;
  const pdfFontCache = getCacheRecord<PDFFont>(_cache, PDF_FONT_CACHE_KEY);
  const cachedFont = pdfFontCache[cacheKey];
  if (cachedFont) {
    return cachedFont;
  }

  const pdfFontPromise = (async () => {
    const fontValue = font[fontName];
    if (!fontValue) {
      throw new Error(`[@pdfme/schemas] Font "${fontName}" is not found.`);
    }

    let fontData = fontValue.data;
    if (typeof fontData === 'string' && fontData.startsWith('http')) {
      const remoteFontDataCache = getCacheRecord<ArrayBuffer>(_cache, REMOTE_FONT_DATA_CACHE_KEY);
      remoteFontDataCache[fontName] ??= fetchRemoteFontData(fontData);
      fontData = await remoteFontDataCache[fontName];
    }
    return pdfDoc.embedFont(fontData, {
      subset: typeof fontValue.subset === 'undefined' ? true : fontValue.subset,
      features,
    });
  })();

  // Attach a no-op rejection handler so that if a caller creates this promise but
  // unwinds before awaiting it (e.g. an earlier await throws for the same broken
  // font data), the rejection doesn't escape as an unhandledRejection and crash
  // the process (#1636). Callers that await the promise still receive the error.
  pdfFontPromise.catch(() => {});
  pdfFontCache[cacheKey] = pdfFontPromise;
  return pdfFontPromise;
};
