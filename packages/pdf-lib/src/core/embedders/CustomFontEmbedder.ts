import { Font, Fontkit, Glyph, TypeFeatures } from '../../types/fontkit.js';

import { createCmap } from './CMap.js';
import { deriveFontFlags } from './FontFlags.js';
import PDFHexString from '../objects/PDFHexString.js';
import PDFRef from '../objects/PDFRef.js';
import PDFString from '../objects/PDFString.js';
import PDFContext from '../PDFContext.js';
import {
  byAscendingId,
  Cache,
  sortedUniq,
  splitTextIntoShapingRuns,
  toHexStringOfMinLength,
} from '../../utils/index.js';

/**
 * How many leading bytes are compared to tell whether a cached font's bytes were overwritten in
 * place. They cover the table directory, whose per-table checksums change with the font. This is
 * a best-effort check, not a full comparison: bytes rewritten past this point with an unchanged
 * directory would reuse the old parse.
 */
const FINGERPRINT_LENGTH = 1024;

type ParsedFont = { byteOffset: number; byteLength: number; fingerprint: Uint8Array; font: Font };

/** fontkit's Font keeps the glyphs it has created (with their code points) in `_glyphs`. */
type GlyphCache = { _glyphs: Record<number, Glyph> };

const parsedFonts = new WeakMap<Fontkit['create'], WeakMap<ArrayBufferLike, ParsedFont[]>>();

const sameBytes = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((byte, idx) => byte === b[idx]);

const hasGlyphCache = (font: Font): font is Font & GlyphCache =>
  typeof (font as Partial<GlyphCache>)._glyphs === 'object';

const createView = (font: Font) => {
  const view = Object.create(font) as Font & GlyphCache;
  view._glyphs = {};
  return view;
};

/**
 * Parses font bytes once per fontkit and byte range, and returns a new view of the parsed font on
 * every call. Views share the directory and decoded tables (as fontkit's own `getVariation` does),
 * but each has its own glyphs, layout engine and cmap processor: a glyph keeps the code points it
 * was first created for, which go into the ToUnicode map, so sharing glyphs would let one
 * document's text change another's, and keep every glyph ever created alive with the bytes.
 * Bytes are looked up by their ArrayBuffer and range (embedFont wraps an ArrayBuffer in a new
 * Uint8Array on every call), and reparsed if their leading bytes changed since.
 *
 * @internal Exported so that @pdfme/schemas measures text with the same parse that embedding
 * uses; not meant to be called by applications.
 */
export const parseFont = (fontkit: Fontkit, fontData: Uint8Array): Font => {
  let fontsByBuffer = parsedFonts.get(fontkit.create);
  if (!fontsByBuffer) {
    fontsByBuffer = new WeakMap();
    parsedFonts.set(fontkit.create, fontsByBuffer);
  }
  let fonts = fontsByBuffer.get(fontData.buffer);
  if (!fonts) {
    fonts = [];
    fontsByBuffer.set(fontData.buffer, fonts);
  }

  const { byteOffset, byteLength } = fontData;
  const fingerprint = fontData.subarray(0, FINGERPRINT_LENGTH);
  const idx = fonts.findIndex((f) => f.byteOffset === byteOffset && f.byteLength === byteLength);
  if (idx !== -1 && sameBytes(fonts[idx].fingerprint, fingerprint)) {
    return createView(fonts[idx].font);
  }

  const font = fontkit.create(fontData);
  // Only fontkit's own fonts can be viewed; anything else is parsed per call.
  if (!hasGlyphCache(font)) return font;
  const parsed = { byteOffset, byteLength, fingerprint: fingerprint.slice(), font };
  if (idx === -1) fonts.push(parsed);
  else fonts[idx] = parsed;
  return createView(font);
};

/**
 * A note of thanks to the developers of https://github.com/foliojs/pdfkit, as
 * this class borrows from:
 *   https://github.com/devongovett/pdfkit/blob/e71edab0dd4657b5a767804ba86c94c58d01fbca/lib/image/jpeg.coffee
 */
class CustomFontEmbedder {
  static async for(
    fontkit: Fontkit,
    fontData: Uint8Array,
    customName?: string,
    fontFeatures?: TypeFeatures,
  ) {
    const font = parseFont(fontkit, fontData);
    return new CustomFontEmbedder(font, fontData, customName, fontFeatures);
  }

  readonly font: Font;
  readonly scale: number;
  readonly fontData: Uint8Array;
  readonly fontName: string;
  readonly customName: string | undefined;
  readonly fontFeatures: TypeFeatures | undefined;

  protected baseFontName: string;
  protected glyphCache: Cache<Glyph[]>;
  private readonly shapedGlyphsById: Map<number, Glyph>;

  protected constructor(
    font: Font,
    fontData: Uint8Array,
    customName?: string,
    fontFeatures?: TypeFeatures,
  ) {
    this.font = font;
    this.scale = 1000 / this.font.unitsPerEm;
    this.fontData = fontData;
    this.fontName = this.font.postscriptName || 'Font';
    this.customName = customName;
    this.fontFeatures = fontFeatures;

    this.baseFontName = '';
    this.shapedGlyphsById = new Map();
    this.glyphCache = Cache.populatedBy(this.allGlyphsInFontSortedById);
  }

  /**
   * Encode the JavaScript string into this font. (JavaScript encodes strings in
   * Unicode, but embedded fonts use their own custom encodings)
   */
  encodeText(text: string): PDFHexString {
    const glyphs = this.layoutGlyphs(text);
    const hexCodes = Array(glyphs.length);
    for (let idx = 0, len = glyphs.length; idx < len; idx++) {
      hexCodes[idx] = toHexStringOfMinLength(glyphs[idx].id, 4);
    }
    return PDFHexString.of(hexCodes.join(''));
  }

  // The advanceWidth takes into account kerning automatically, so we don't
  // have to do that manually like we do for the standard fonts.
  widthOfTextAtSize(text: string, size: number): number {
    const glyphs = this.layoutGlyphs(text);
    let totalWidth = 0;
    for (let idx = 0, len = glyphs.length; idx < len; idx++) {
      totalWidth += glyphs[idx].advanceWidth * this.scale;
    }
    const scale = size / 1000;
    return totalWidth * scale;
  }

  /**
   * Layout `text` as one or more fontkit runs. Thai/Lao spans are shaped
   * separately so GSUB mark variants are selected even when Latin/CJK leads.
   * A script tag is never passed — each run has one strong script, so fontkit
   * auto-detection matches the script we would have specified.
   */
  protected layoutGlyphs(text: string): Glyph[] {
    const runs = splitTextIntoShapingRuns(text);
    let glyphs: Glyph[];
    if (runs.length <= 1) {
      glyphs = this.font.layout(runs[0] ?? '', this.fontFeatures).glyphs;
    } else {
      // Loop-push: `push(...runGlyphs)` overflows on long mixed-script strings.
      glyphs = [];
      for (const run of runs) {
        const runGlyphs = this.font.layout(run, this.fontFeatures).glyphs;
        for (let idx = 0, len = runGlyphs.length; idx < len; idx++) {
          glyphs.push(runGlyphs[idx]);
        }
      }
    }
    this.registerShapedGlyphs(glyphs);
    return glyphs;
  }

  /**
   * GSUB can emit glyphs that are not in `font.characterSet` (e.g. Sarabun
   * tone gid 736). Retain those objects so `computeWidths()` and
   * `embedUnicodeCmap()` include them when the full font is embedded.
   */
  protected registerShapedGlyphs(glyphs: Glyph[]): void {
    let added = false;
    for (let idx = 0, len = glyphs.length; idx < len; idx++) {
      const glyph = glyphs[idx];
      if (!this.shapedGlyphsById.has(glyph.id)) {
        this.shapedGlyphsById.set(glyph.id, glyph);
        added = true;
      }
    }
    if (added) this.glyphCache.invalidate();
  }

  heightOfFontAtSize(size: number, options: { descender?: boolean } = {}): number {
    const { descender = true } = options;

    const { ascent, descent, bbox } = this.font;
    const yTop = (ascent || bbox.maxY) * this.scale;
    const yBottom = (descent || bbox.minY) * this.scale;

    let height = yTop - yBottom;
    if (!descender) height -= Math.abs(descent) || 0;

    return (height / 1000) * size;
  }

  sizeOfFontAtHeight(height: number): number {
    const { ascent, descent, bbox } = this.font;
    const yTop = (ascent || bbox.maxY) * this.scale;
    const yBottom = (descent || bbox.minY) * this.scale;
    return (1000 * height) / (yTop - yBottom);
  }

  embedIntoContext(context: PDFContext, ref?: PDFRef): Promise<PDFRef> {
    this.baseFontName = this.customName || context.addRandomSuffix(this.fontName);
    return this.embedFontDict(context, ref);
  }

  protected async embedFontDict(context: PDFContext, ref?: PDFRef): Promise<PDFRef> {
    const cidFontDictRef = await this.embedCIDFontDict(context);
    const unicodeCMapRef = this.embedUnicodeCmap(context);

    const fontDict = context.obj({
      Type: 'Font',
      Subtype: 'Type0',
      BaseFont: this.baseFontName,
      Encoding: 'Identity-H',
      DescendantFonts: [cidFontDictRef],
      ToUnicode: unicodeCMapRef,
    });

    if (ref) {
      context.assign(ref, fontDict);
      return ref;
    } else {
      return context.register(fontDict);
    }
  }

  protected isCFF(): boolean {
    return this.font.cff;
  }

  protected async embedCIDFontDict(context: PDFContext): Promise<PDFRef> {
    const fontDescriptorRef = await this.embedFontDescriptor(context);

    const cidFontDict = context.obj({
      Type: 'Font',
      Subtype: this.isCFF() ? 'CIDFontType0' : 'CIDFontType2',
      CIDToGIDMap: 'Identity',
      BaseFont: this.baseFontName,
      CIDSystemInfo: {
        Registry: PDFString.of('Adobe'),
        Ordering: PDFString.of('Identity'),
        Supplement: 0,
      },
      FontDescriptor: fontDescriptorRef,
      W: this.computeWidths(),
    });

    return context.register(cidFontDict);
  }

  protected async embedFontDescriptor(context: PDFContext): Promise<PDFRef> {
    const fontStreamRef = await this.embedFontStream(context);

    const { scale } = this;
    const { italicAngle, ascent, descent, capHeight, xHeight } = this.font;
    const { minX, minY, maxX, maxY } = this.font.bbox;

    const fontDescriptor = context.obj({
      Type: 'FontDescriptor',
      FontName: this.baseFontName,
      Flags: deriveFontFlags(this.font),
      FontBBox: [minX * scale, minY * scale, maxX * scale, maxY * scale],
      ItalicAngle: italicAngle,
      Ascent: ascent * scale,
      Descent: descent * scale,
      CapHeight: (capHeight || ascent) * scale,
      XHeight: (xHeight || 0) * scale,

      // Not sure how to compute/find this, nor is anybody else really:
      // https://stackoverflow.com/questions/35485179/stemv-value-of-the-truetype-font
      StemV: 0,

      [this.isCFF() ? 'FontFile3' : 'FontFile2']: fontStreamRef,
    });

    return context.register(fontDescriptor);
  }

  protected async serializeFont(): Promise<Uint8Array> {
    return this.fontData;
  }

  protected async embedFontStream(context: PDFContext): Promise<PDFRef> {
    const fontStream = context.flateStream(await this.serializeFont(), {
      Subtype: this.isCFF() ? 'CIDFontType0C' : undefined,
    });
    return context.register(fontStream);
  }

  protected embedUnicodeCmap(context: PDFContext): PDFRef {
    const cmap = createCmap(this.glyphCache.access(), this.glyphId.bind(this));
    const cmapStream = context.flateStream(cmap);
    return context.register(cmapStream);
  }

  protected glyphId(glyph?: Glyph): number {
    return glyph ? glyph.id : -1;
  }

  protected computeWidths(): (number | number[])[] {
    const glyphs = this.glyphCache.access();

    const widths: (number | number[])[] = [];
    let currSection: number[] = [];

    for (let idx = 0, len = glyphs.length; idx < len; idx++) {
      const currGlyph = glyphs[idx];
      const prevGlyph = glyphs[idx - 1];

      const currGlyphId = this.glyphId(currGlyph);
      const prevGlyphId = this.glyphId(prevGlyph);

      if (idx === 0) {
        widths.push(currGlyphId);
      } else if (currGlyphId - prevGlyphId !== 1) {
        widths.push(currSection);
        widths.push(currGlyphId);
        currSection = [];
      }

      currSection.push(currGlyph.advanceWidth * this.scale);
    }

    widths.push(currSection);

    return widths;
  }

  private allGlyphsInFontSortedById = (): Glyph[] => {
    const glyphs: Glyph[] = Array(this.font.characterSet.length + this.shapedGlyphsById.size);
    for (let idx = 0, len = this.font.characterSet.length; idx < len; idx++) {
      const codePoint = this.font.characterSet[idx];
      glyphs[idx] = this.font.glyphForCodePoint(codePoint);
    }
    let extraIdx = this.font.characterSet.length;
    for (const glyph of this.shapedGlyphsById.values()) {
      glyphs[extraIdx++] = glyph;
    }
    return sortedUniq(glyphs.sort(byAscendingId), (g) => g.id);
  };
}

export default CustomFontEmbedder;
