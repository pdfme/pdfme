import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFFont, StandardFonts } from 'pdf-lib';
import { calculateTextWidthInMm } from '../calculateTextWidthInMm';

describe('calculateTextWidthInMm', () => {
  let font: PDFFont;

  beforeAll(async () => {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    font = await doc.embedFont(StandardFonts.Helvetica);
  });

  it('returns the correct width for a simple string', () => {
    const textContent = 'Hello, world!';
    const textFontSize = 12;
    const textCharacterSpacing = 0;

    const width = calculateTextWidthInMm(textContent, textFontSize, font, textCharacterSpacing);

    expect(width).toBe(23.139414575999997);
  });

  it('accounts for character spacing', () => {
    const textContent = 'Hello, world!';
    const textFontSize = 12;
    const textCharacterSpacing = 1;

    const width = calculateTextWidthInMm(textContent, textFontSize, font, textCharacterSpacing);

    expect(width).toBe(27.372750575999998);
  });

  it('returns 0 for an empty string', () => {
    const textContent = '';
    const textFontSize = 12;
    const textCharacterSpacing = 0;

    const width = calculateTextWidthInMm(textContent, textFontSize, font, textCharacterSpacing);

    expect(width).toBe(0);
  });
});
