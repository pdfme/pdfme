/**
 * Font handling.
 *
 * `pdf-lib` exposes only `encodeText`, `widthOfTextAtSize` and `heightAtSize`
 * on `PDFFont`; the metrics and per-glyph advances the SVG converter needs live
 * on the embedder. This module wraps a `PDFFont` and derives that surface from
 * the embedder, handling both standard (AFM) and custom (fontkit) fonts.
 */

import type PDFRef from '../core/objects/PDFRef.js';
import type PDFFont from '../api/PDFFont.js';

/** Metrics in 1/1000 em, matching the units used by SVG text layout. */
export interface FontMetrics {
  ascender: number;
  descender: number;
  xHeight: number;
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface GlyphPosition {
  /** Number of source characters this glyph covers (more than 1 for ligatures). */
  unicode: number;
  /** Advance width in 1/1000 em. */
  advanceWidth: number;
  /** Horizontal advance in 1/1000 em (advance plus kerning). */
  xAdvance: number;
  xOffset: number;
  yOffset: number;
  yAdvance: number;
}

export interface Font {
  /** Indirect reference the font is registered under in a resource dict. */
  readonly ref: PDFRef;
  readonly pdfFont: PDFFont;
  readonly metrics: FontMetrics;
  /** Encode a string into one hex glyph code per position. */
  encode(text: string): [string[], GlyphPosition[]];
  widthOfString(text: string, size: number): number;
}

/** Shape of the `embedder` property, which pdf-lib does not type publicly. */
interface FontEmbedderLike {
  font: unknown;
  scale?: number;
  fontFeatures?: unknown;
  encodeText(text: string): { asString(): string };
}

function getEmbedder(font: PDFFont): FontEmbedderLike {
  return (font as unknown as { embedder: FontEmbedderLike }).embedder;
}

/** Fontkit `Font`, as declared by pdf-lib. */
interface FontkitFont {
  unitsPerEm: number;
  ascent: number;
  descent: number;
  xHeight?: number;
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  layout(
    text: string,
    features?: unknown,
  ): {
    glyphs: { id: number; advanceWidth: number; codePoints: number[] }[];
    positions: {
      xAdvance: number;
      yAdvance: number;
      xOffset: number;
      yOffset: number;
    }[];
  };
}

/** AFM `Font` from `@pdf-lib/standard-fonts`. */
interface AfmFont {
  Ascender?: number;
  Descender?: number;
  XHeight?: number;
  FontBBox: [number, number, number, number];
  getWidthOfGlyph(glyphName: string): number;
  getXAxisKerningForPair(left: string, right: string): number;
}

interface AfmGlyph {
  code: number;
  name: string;
}

interface AfmEmbedderLike extends FontEmbedderLike {
  font: AfmFont;
  encoding: { encodeUnicodeCodePoint(codePoint: number): AfmGlyph };
}

function isAfmEmbedder(embedder: FontEmbedderLike): embedder is AfmEmbedderLike {
  const font = embedder.font as Partial<AfmFont>;
  return typeof font.getWidthOfGlyph === 'function' && !!font.FontBBox;
}

function fontkitMetrics(font: FontkitFont): FontMetrics {
  const scale = 1000 / font.unitsPerEm;
  return {
    ascender: font.ascent * scale,
    descender: font.descent * scale,
    xHeight: (font.xHeight ?? 0.5 * (font.ascent - font.descent)) * scale,
    bbox: {
      minX: font.bbox.minX * scale,
      minY: font.bbox.minY * scale,
      maxX: font.bbox.maxX * scale,
      maxY: font.bbox.maxY * scale,
    },
  };
}

function afmMetrics(font: AfmFont): FontMetrics {
  return {
    ascender: font.Ascender ?? font.FontBBox[3],
    descender: font.Descender ?? font.FontBBox[1],
    xHeight: font.XHeight ?? 0,
    bbox: {
      minX: font.FontBBox[0],
      minY: font.FontBBox[1],
      maxX: font.FontBBox[2],
      maxY: font.FontBBox[3],
    },
  };
}

/** Format a glyph code as uppercase hex of at least `minLength` digits. */
function toHex(value: number, minLength: number): string {
  return value.toString(16).toUpperCase().padStart(minLength, '0');
}

/** Wrap a pdf-lib `PDFFont` so the converter can measure and encode text. */
export class PdfFont implements Font {
  readonly metrics: FontMetrics;
  private readonly embedder: FontEmbedderLike;
  private readonly afm: AfmEmbedderLike | null;

  constructor(
    readonly ref: PDFRef,
    readonly pdfFont: PDFFont,
    private readonly size: number,
  ) {
    this.embedder = getEmbedder(pdfFont);
    this.afm = isAfmEmbedder(this.embedder) ? this.embedder : null;
    this.metrics = this.afm
      ? afmMetrics(this.afm.font)
      : fontkitMetrics(this.embedder.font as FontkitFont);
  }

  /**
   * Encode text into one hex glyph code per glyph position.
   *
   * Both embedder kinds are driven glyph by glyph rather than by handing the
   * whole string to `encodeText`, because the layout engine needs per-glyph
   * advances and kerning to position each glyph individually.
   */
  encode(text: string): [string[], GlyphPosition[]] {
    return this.afm ? this.encodeAfm(text) : this.encodeFontkit(text);
  }

  widthOfString(text: string, size = this.size): number {
    return this.pdfFont.widthOfTextAtSize(text, size);
  }

  /** Encode using the AFM tables of a standard font (1-byte codes). */
  private encodeAfm(text: string): [string[], GlyphPosition[]] {
    const afm = this.afm!;
    const glyphs = Array.from(text).map((char) =>
      afm.encoding.encodeUnicodeCodePoint(char.codePointAt(0)!),
    );
    return [
      glyphs.map((glyph) => toHex(glyph.code, 2)),
      glyphs.map((glyph, index) => {
        const next = glyphs[index + 1];
        const kern = next ? afm.font.getXAxisKerningForPair(glyph.name, next.name) || 0 : 0;
        const width = afm.font.getWidthOfGlyph(glyph.name) || 250;
        return {
          unicode: 1,
          advanceWidth: width,
          xAdvance: width + kern,
          xOffset: 0,
          yOffset: 0,
          yAdvance: 0,
        };
      }),
    ];
  }

  /**
   * Encode using the embedder of an embedded (CID-keyed) font.
   *
   * The embedder produces the glyph codes rather than fontkit directly: for
   * subset embedders it also remaps the codes into the subset and records the
   * glyphs that must be embedded. Fontkit is then asked for the advances that
   * go with those glyphs.
   */
  private encodeFontkit(text: string): [string[], GlyphPosition[]] {
    const embedder = this.embedder;
    const font = embedder.font as FontkitFont;
    const hex = embedder.encodeText(text).asString();
    const run = font.layout(text, embedder.fontFeatures);
    const scale = 1000 / font.unitsPerEm;

    // Embedded fonts are keyed by 2-byte glyph ids, standard fonts by
    // single-byte codes.
    const codeWidth = run.glyphs.length > 0 ? hex.length / run.glyphs.length : 4;
    const glyphHex: string[] = [];
    for (let i = 0; i < run.glyphs.length; i++) {
      glyphHex.push(hex.substr(i * codeWidth, codeWidth));
    }

    const positions = run.glyphs.map((glyph, index) => {
      const pos = run.positions[index];
      return {
        unicode: glyph.codePoints.length,
        advanceWidth: glyph.advanceWidth * scale,
        xAdvance: (pos?.xAdvance ?? glyph.advanceWidth) * scale,
        xOffset: (pos?.xOffset ?? 0) * scale,
        yOffset: (pos?.yOffset ?? 0) * scale,
        yAdvance: (pos?.yAdvance ?? 0) * scale,
      };
    });
    return [glyphHex, positions];
  }
}
