import { readFileSync } from 'fs';
import * as path from 'path';
import { Font, getDefaultFont } from '@pdfme/common';

let fontCache: Font | null = null;

const PDFParser = require('pdf2json');
const SauceHanSansJPData = readFileSync(path.join(__dirname, `/assets/fonts/SauceHanSansJP.ttf`));
const SauceHanSerifJPData = readFileSync(path.join(__dirname, `/assets/fonts/SauceHanSerifJP.ttf`));
const NotoSerifJPRegularData = readFileSync(
  // path.join(__dirname, `/assets/fonts/NotoSerifJP-Regular.otf`)
  path.join(__dirname, `/assets/fonts/NotoSerifJP-Regular.ttf`)
);
const NotoSansJPRegularData = readFileSync(
  // path.join(__dirname, `/assets/fonts/NotoSansJP-Regular.otf`)
  path.join(__dirname, `/assets/fonts/NotoSansJP-Regular.ttf`)
);
const GloriaHallelujahRegularData = readFileSync(
  path.join(__dirname, `/assets/fonts/GloriaHallelujah-Regular.ttf`)
);
const GreatVibesRegularData = readFileSync(
  path.join(__dirname, `/assets/fonts/GreatVibes-Regular.ttf`)
);
const JuliusSansOneRegularData = readFileSync(
  path.join(__dirname, `/assets/fonts/JuliusSansOne-Regular.ttf`)
);

export const getFont = (): Font => {
  if (fontCache) {
    // Return a new object to avoid modifying the cache
    return {
      ...fontCache,
      ...Object.fromEntries(
        Object.entries(fontCache).map(([key, value]) => [
          key,
          { ...value }
        ])
      )
    };
  }
  
  // Initialize cache with default font first
  fontCache = getDefaultFont();
  
  // Add custom fonts one by one to avoid memory pressure
  fontCache.SauceHanSansJP = { data: SauceHanSansJPData };
  fontCache.SauceHanSerifJP = { data: SauceHanSerifJPData };
  fontCache['NotoSerifJP-Regular'] = { data: NotoSerifJPRegularData };
  fontCache['NotoSansJP-Regular'] = { data: NotoSansJPRegularData };
  fontCache['GloriaHallelujah-Regular'] = { data: GloriaHallelujahRegularData };
  fontCache['GreatVibes-Regular'] = { data: GreatVibesRegularData };
  fontCache['JuliusSansOne-Regular'] = { data: JuliusSansOneRegularData };
  fontCache.NotoSerifJP = { data: NotoSerifJPRegularData };
  fontCache.NotoSansJP = { data: NotoSansJPRegularData };
  
  return getFont(); // Call recursively to get a clean copy
};

export const getPdf = (pdfFilePath: string) => {
  const pdfParser = new PDFParser();

  return new Promise((resolve, reject) => {
    pdfParser.on('pdfParser_dataError', reject);
    pdfParser.on('pdfParser_dataReady', resolve);
    pdfParser.loadPDF(pdfFilePath);
  });
};

const getPdfPath = (dir: string, fileName: string) =>
  path.join(__dirname, `assets/pdfs/${dir}/${fileName}`);

export const getPdfTmpPath = (fileName: string) => getPdfPath('tmp', fileName);
export const getPdfAssertPath = (fileName: string) => getPdfPath('assert', fileName);
