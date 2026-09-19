import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';

import {
  CustomFontEmbedder,
  PDFContext,
  PDFDict,
  PDFHexString,
  PDFRef,
} from '../../../src/index';

const ubuntuFont = fs.readFileSync('./assets/fonts/ubuntu/Ubuntu-R.ttf');
const sarabunFont = fs.readFileSync(
  './assets/fonts/sarabun/Sarabun-Regular.ttf',
);
const sourceHansFont = fs.readFileSync(
  './assets/fonts/source_hans_jp/SourceHanSerifJP-Regular.otf',
);

describe(`CustomFontEmbedder`, () => {
  it(`can be constructed with CustomFontEmbedder.for(...)`, async () => {
    const embedder = await CustomFontEmbedder.for(fontkit, ubuntuFont);
    expect(embedder).toBeInstanceOf(CustomFontEmbedder);
  });

  it(`exposes the font's name`, async () => {
    const embedder = await CustomFontEmbedder.for(
      fontkit,
      new Uint8Array(ubuntuFont),
    );
    expect(embedder.fontName).toBe('Ubuntu');
  });

  it(`can set a custom font name`, async () => {
    const customName = 'abc123';
    const embedder = await CustomFontEmbedder.for(
      fontkit,
      new Uint8Array(ubuntuFont),
      customName,
    );
    expect(embedder.customName).toBe(customName);
  });

  it(`can embed font dictionaries into PDFContexts without a predefined ref`, async () => {
    const context = PDFContext.create();
    const embedder = await CustomFontEmbedder.for(
      fontkit,
      new Uint8Array(ubuntuFont),
    );

    expect(context.enumerateIndirectObjects().length).toBe(0);
    const ref = await embedder.embedIntoContext(context);
    expect(context.enumerateIndirectObjects().length).toBe(5);
    expect(context.lookup(ref)).toBeInstanceOf(PDFDict);
  });

  it(`can embed font dictionaries into PDFContexts with a predefined ref`, async () => {
    const context = PDFContext.create();
    const predefinedRef = PDFRef.of(9999);
    const embedder = await CustomFontEmbedder.for(
      fontkit,
      new Uint8Array(ubuntuFont),
    );

    expect(context.enumerateIndirectObjects().length).toBe(0);
    const ref = await embedder.embedIntoContext(context, predefinedRef);
    expect(context.enumerateIndirectObjects().length).toBe(5);
    expect(context.lookup(predefinedRef)).toBeInstanceOf(PDFDict);
    expect(ref).toBe(predefinedRef);
  });

  it(`can encode text strings into PDFHexString objects`, async () => {
    const text = 'Stuff and thingz!';
    const hexCodes =
      '00360057005801AA000300440051004700030057004B004C0051004A005D0004';
    const embedder = await CustomFontEmbedder.for(fontkit, ubuntuFont);

    expect(embedder.encodeText(text)).toBeInstanceOf(PDFHexString);
    expect(String(embedder.encodeText(text))).toBe(
      String(PDFHexString.of(hexCodes)),
    );
  });

  it(`can measure the width of text strings at the given font size`, async () => {
    const text = 'Stuff and thingz!';
    const embedder = await CustomFontEmbedder.for(fontkit, ubuntuFont);
    expect(embedder.widthOfTextAtSize(text, 12)).toBe(90.672);
    expect(embedder.widthOfTextAtSize(text, 24)).toBe(181.344);
  });

  it(`can measure the height of the font at the given size`, async () => {
    const embedder = await CustomFontEmbedder.for(fontkit, ubuntuFont);
    expect(embedder.heightOfFontAtSize(12)).toBeCloseTo(13.452);
    expect(embedder.heightOfFontAtSize(24)).toBeCloseTo(26.904);
  });

  it(`can measure the size of the font at a given height`, async () => {
    const embedder = await CustomFontEmbedder.for(fontkit, ubuntuFont);
    expect(embedder.sizeOfFontAtHeight(12)).toBeCloseTo(10.705);
    expect(embedder.sizeOfFontAtHeight(24)).toBeCloseTo(21.409);
  });

  describe(`Thai script-run shaping (Sarabun)`, () => {
    const THAI_ONLY_HEX = '01DE02DD01CE01CC02F202E0';
    const LATIN_THAI_HEX = '0004000301DE02DD01CE01CC02F202E0';
    const SARA_AM_LIGATURE_HEX = '01CE02FA01E8'; // 462, 762, 488

    it(`encodes Thai-only text with raised mark variants (regression)`, async () => {
      const embedder = await CustomFontEmbedder.for(fontkit, sarabunFont);
      expect(String(embedder.encodeText('วันที่'))).toBe(
        String(PDFHexString.of(THAI_ONLY_HEX)),
      );
    });

    it(`encodes Latin-leading Thai with the raised mark gid path`, async () => {
      const embedder = await CustomFontEmbedder.for(fontkit, sarabunFont);
      const encoded = embedder.encodeText('A วันที่');
      expect(String(encoded)).toBe(String(PDFHexString.of(LATIN_THAI_HEX)));
      expect(encoded.asString().endsWith('02E0')).toBe(true);
      expect(encoded.asString().endsWith('02DF')).toBe(false);
    });

    it(`encodes digit-leading Thai as a single thai-shaped run`, async () => {
      const embedder = await CustomFontEmbedder.for(fontkit, sarabunFont);
      expect(embedder.encodeText('1 วันที่').asString().endsWith('02E0')).toBe(
        true,
      );
    });

    it(`encodes CJK-leading Thai with the raised mark gid`, async () => {
      const embedder = await CustomFontEmbedder.for(fontkit, sarabunFont);
      expect(embedder.encodeText('日 วันที่').asString().endsWith('02E0')).toBe(
        true,
      );
    });

    it(`encodes mixed-script SARA AM with the thai ligature`, async () => {
      const embedder = await CustomFontEmbedder.for(fontkit, sarabunFont);
      expect(embedder.encodeText('A น้ำ').asString()).toContain(
        SARA_AM_LIGATURE_HEX,
      );
    });

    it(`measures mixed Latin+Thai width as the sum of its runs`, async () => {
      const embedder = await CustomFontEmbedder.for(fontkit, sarabunFont);
      expect(embedder.widthOfTextAtSize('A วันที่', 12)).toBe(
        embedder.widthOfTextAtSize('A ', 12) +
          embedder.widthOfTextAtSize('วันที่', 12),
      );
      expect(embedder.widthOfTextAtSize('A วันที่', 24)).toBe(
        embedder.widthOfTextAtSize('A ', 24) +
          embedder.widthOfTextAtSize('วันที่', 24),
      );
    });

    it(`leaves Latin+CJK strings bit-identical to whole-string layout`, async () => {
      const embedder = await CustomFontEmbedder.for(fontkit, sourceHansFont);
      const text = 'Invoice 請求書 2024年1月';
      const wholeStringHex = fontkit
        .create(sourceHansFont)
        .layout(text)
        .glyphs.map((glyph) => glyph.id.toString(16).padStart(4, '0').toUpperCase())
        .join('');
      expect(embedder.encodeText(text).asString()).toBe(wholeStringHex);
    });
  });
});
