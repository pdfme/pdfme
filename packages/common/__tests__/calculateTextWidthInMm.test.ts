import * as fontkit from 'fontkit';
import { PDFDocument, PDFFont } from '@pdfme/pdf-lib';
import { calculateTextWidthInMm } from '../src/helpers/calculateTextWidthInMm';
import { Roboto } from '../src/constants';

describe('calculateTextWidthInMm', () => {
  let font: PDFFont;

  beforeAll(async () => {
    const doc = await PDFDocument.create();

    doc.registerFontkit(fontkit);
    font = await doc.embedFont(Roboto);
  });

  it('returns the correct width for a simple string', () => {
    const textContent = 'Hello, world!';
    const textFontSize = 12;
    const textCharacterSpacing = 0;

    const width = calculateTextWidthInMm(textContent, textFontSize, font, textCharacterSpacing);

    expect(width).toBe(23.1421640625);
  });

  it('accounts for character spacing', () => {
    const textContent = 'Hello, world!';
    const textFontSize = 12;
    const textCharacterSpacing = 1;

    const width = calculateTextWidthInMm(textContent, textFontSize, font, textCharacterSpacing);

    expect(width).toBe(27.3757640625);
  });

  it('returns 0 for an empty string', () => {
    const textContent = '';
    const textFontSize = 12;
    const textCharacterSpacing = 0;

    const width = calculateTextWidthInMm(textContent, textFontSize, font, textCharacterSpacing);

    expect(width).toBe(0);
  });
});
