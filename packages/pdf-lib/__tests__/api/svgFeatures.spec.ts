import { PDFContentStream, PDFDict, PDFDocument, PDFName, PDFRef } from '../../src/index';
import type { PDFPage } from '../../src/index';

const content = (page: PDFPage) => {
  const contents = page.node.normalizedEntries().Contents;
  if (!contents) return '';
  const streams = [];
  for (let idx = 0; idx < contents.size(); idx++) {
    streams.push(contents.lookup(idx, PDFContentStream).getContentsString());
  }
  return streams.join('\n');
};

/**
 * Resolve a resource entry to its dictionary text. Entries are indirect
 * references to a dict or to a stream, whose dictionary holds the keys.
 */
const dictText = (page: PDFPage, value: unknown): string => {
  const resolved = value instanceof PDFRef ? page.node.context.lookup(value) : value;
  if (!resolved || typeof resolved !== 'object') return String(value);
  const dict = resolved instanceof PDFDict ? resolved : (resolved as { dict?: PDFDict }).dict;
  return dict ? String(dict.toString()).replace(/\s+/g, ' ') : String(resolved);
};

/** Flatten the page's resource section into `name -> dictionary text`. */
const resources = (page: PDFPage, section: string): Record<string, string> => {
  const dict = page.node.Resources()?.get(PDFName.of(section));
  if (!dict) return {};
  const out: Record<string, string> = {};
  for (const [name, value] of (dict as unknown as { entries(): Iterable<[unknown, unknown]> }).entries()) {
    out[name.toString().replace(/^\//, '')] = dictText(page, value);
  }
  return out;
};

/** Every form XObject's BBox, so inversions are caught. */
const formBoxes = (page: PDFPage): number[][] => {
  const boxes: number[][] = [];
  for (const [ref, object] of page.node.context.enumerateIndirectObjects()) {
    if (!('dict' in (object as unknown as Record<string, unknown>))) continue;
    const dict = (object as unknown as { dict: { get(name: unknown): unknown } }).dict;
    if (String(dict.get(PDFName.of('Subtype'))) !== '/Form') continue;
    const bbox = dict.get(PDFName.of('BBox'));
    if (!bbox) continue;
    boxes.push(
      (bbox as unknown as { asArray(): unknown[] }).asArray().map((n) => Number(String(n))),
    );
  }
  return boxes;
};

describe('PDFPage.drawSvg features', () => {
  let pdfDoc: PDFDocument;
  let page: PDFPage;

  beforeEach(async () => {
    pdfDoc = await PDFDocument.create();
    page = pdfDoc.addPage([200, 200]);
  });

  it('resolves url(#id) paint servers into shading patterns', async () => {
    await page.drawSvg(
      `<svg width="100" height="100">
        <defs>
          <linearGradient id="g">
            <stop offset="0" stop-color="red"/>
            <stop offset="1" stop-color="blue"/>
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#g)"/>
      </svg>`,
    );

    const patterns = Object.values(resources(page, 'Pattern')).join(' ');
    expect(patterns).toContain('/PatternType 2');
    expect(content(page)).toMatch(/scn/);
  });

  it('tiles a pattern at the size its width and height ask for', async () => {
    await page.drawSvg(
      `<svg width="100" height="100">
        <defs>
          <pattern id="p" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="5" r="5" fill="green"/>
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#p)"/>
      </svg>`,
      { width: 100, height: 100 },
    );

    const dict = Object.values(resources(page, 'Pattern')).join(' ');
    // Tile geometry is in SVG user units; the CTM (including the px->pt scale
    // and the y-flip) is folded into the pattern matrix, not into the steps.
    expect(dict).toContain('/PatternType 1');
    expect(dict).toContain('/XStep 10');
    expect(dict).toContain('/YStep 10');
    expect(dict).toMatch(/\/Matrix \[ 0\.75 0 0 -0\.75/);
  });

  it('clips an element to its clip-path', async () => {
    await page.drawSvg(
      `<svg width="100" height="100">
        <defs><clipPath id="c"><circle cx="50" cy="50" r="40"/></clipPath></defs>
        <rect width="100" height="100" fill="tomato" clip-path="url(#c)"/>
      </svg>`,
      { width: 100, height: 100 },
    );

    // A clip path becomes a luminosity soft mask pointing at a group.
    expect(content(page)).toMatch(/\/GS-\d+ gs/);
    expect(Object.values(resources(page, 'ExtGState')).join(' ')).toContain('/SMask');
    expect(Object.values(resources(page, 'ExtGState')).join(' ')).toContain('/S /Luminosity');
  });

  it('masks an element with a luminance mask', async () => {
    await page.drawSvg(
      `<svg width="100" height="100">
        <defs>
          <mask id="m">
            <rect width="100" height="100" fill="white"/>
            <circle cx="50" cy="50" r="30" fill="black"/>
          </mask>
        </defs>
        <rect width="100" height="100" fill="steelblue" mask="url(#m)"/>
      </svg>`,
      { width: 100, height: 100 },
    );

    expect(content(page)).toMatch(/\/GS-\d+ gs/);
    expect(content(page)).toMatch(/Do/);
    for (const [x0, y0, x1, y1] of formBoxes(page)) {
      expect(x0).toBeLessThanOrEqual(x1);
      expect(y0).toBeLessThanOrEqual(y1);
    }
  });

  it('draws a group with opacity through a transparency group', async () => {
    await page.drawSvg(
      `<svg width="100" height="100">
        <g opacity="0.5"><rect width="50" height="50" fill="red"/></g>
        <rect y="50" width="100" height="20" fill="blue"/>
      </svg>`,
      { width: 100, height: 100 },
    );

    const stream = content(page);
    expect(stream).toMatch(/Do/);
    // The trailing rect is painted after the group, i.e. it survives.
    expect(stream.indexOf('Do')).toBeLessThan(stream.indexOf('0 0 1 rg'));
  });

  it('applies stroke-dasharray', async () => {
    await page.drawSvg(
      `<svg width="100" height="100">
        <path d="M0 50H100" stroke="black" stroke-width="4" stroke-dasharray="10 5"/>
      </svg>`,
      { width: 100, height: 100 },
    );

    expect(content(page)).toMatch(/\[10 5\] 0 d/);
  });

  it('honours transform-origin', async () => {
    await page.drawSvg(
      `<svg width="120" height="100" viewBox="0 0 120 100">
        <g transform-origin="60px 90px" transform="rotate(10)">
          <rect x="10" y="80" width="40" height="20" fill="purple"/>
        </g>
      </svg>`,
      { width: 90, height: 75 },
    );

    const cos = Math.cos((10 * Math.PI) / 180);
    const sin = Math.sin((10 * Math.PI) / 180);
    const matrices = [...content(page).matchAll(/([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) cm/g)].map(
      (m) => m.slice(1, 7).map(Number),
    );
    const rotation = matrices.find((m) => Math.abs(m[0] - cos) < 1e-9);
    expect(rotation).toBeDefined();
    expect(rotation![0]).toBeCloseTo(cos, 6);
    expect(rotation![1]).toBeCloseTo(sin, 6);
    expect(rotation![2]).toBeCloseTo(-sin, 6);
    expect(rotation![3]).toBeCloseTo(cos, 6);
    expect(rotation![4]).toBeCloseTo(60 * (1 - cos) + sin * 90, 6);
    expect(rotation![5]).toBeCloseTo(-sin * 60 + 90 * (1 - cos), 6);
  });

  it('advances every glyph when letter-spacing is set', async () => {
    await page.drawSvg(
      `<svg width="280" height="100">
        <text x="10" y="50" font-family="Helvetica" font-size="20" letter-spacing="4">spaced</text>
      </svg>`,
      { width: 280, height: 100 },
    );

    // One text matrix per glyph: spacing breaks the run.
    const matrices = content(page).match(/[\d.-]+ [\d.-]+ [\d.-]+ [\d.-]+ [\d.-]+ [\d.-]+ Tm/g) ?? [];
    expect(matrices).toHaveLength(6);
  });

  it('renders text with leading whitespace between elements', async () => {
    await page.drawSvg(
      `<svg width="280" height="100">
        <text x="10" y="30" font-family="Helvetica" font-size="16">
          <tspan fill="red">one</tspan>
          <tspan fill="blue">two</tspan>
        </text>
      </svg>`,
      { width: 280, height: 100 },
    );

    expect(content(page)).toMatch(/TJ/);
  });

  it('instances use and symbol elements', async () => {
    await page.drawSvg(
      `<svg width="100" height="100">
        <defs>
          <g id="grp"><rect width="20" height="20" fill="red"/></g>
          <symbol id="sym" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="blue"/></symbol>
        </defs>
        <use href="#grp" x="10" y="10"/>
        <use href="#sym" x="40" y="10" width="30" height="30"/>
      </svg>`,
      { width: 100, height: 100 },
    );

    expect(content(page)).toMatch(/1 0 0 rg/);
    expect(content(page)).toMatch(/0 0 1 rg/);
  });

  it('places markers at the ends and vertices of a path', async () => {
    await page.drawSvg(
      `<svg width="100" height="100">
        <defs>
          <marker id="mk" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4">
            <circle cx="5" cy="5" r="4" fill="black"/>
          </marker>
        </defs>
        <path d="M10 50 L50 50 L90 50" fill="none" stroke="black" marker-start="url(#mk)" marker-end="url(#mk)"/>
      </svg>`,
      { width: 100, height: 100 },
    );

    // Markers are emitted inline, as path operators.
    expect(content(page)).toMatch(/1 0 0 1 10 50 cm/);
    expect(content(page)).toMatch(/re/);
  });

  it('applies CSS rules from a style element', async () => {
    await page.drawSvg(
      `<svg width="100" height="100">
        <style>.box { fill: rgb(0, 128, 0); } #special { fill: red }</style>
        <rect class="box" width="20" height="20"/>
        <rect id="special" x="30" width="20" height="20"/>
      </svg>`,
      { width: 100, height: 100 },
    );

    const stream = content(page);
    expect(stream).toContain('0 0.5019607843137255 0 rg'); // green
    expect(stream).toContain('1 0 0 rg'); // red
  });

  it('applies mix-blend-mode on a group', async () => {
    await page.drawSvg(
      `<svg width="100" height="100">
        <rect width="100" height="100" fill="white"/>
        <g style="mix-blend-mode:multiply" opacity="0.8"><circle cx="50" cy="50" r="30" fill="yellow"/></g>
      </svg>`,
      { width: 100, height: 100 },
    );

    expect(Object.values(resources(page, 'ExtGState')).join(' ')).toContain('/BM /Multiply');
  });

  it('nests svg elements with their own viewBox', async () => {
    await page.drawSvg(
      `<svg width="200" height="200" viewBox="0 0 120 100">
        <svg x="10" y="10" width="50" height="40" viewBox="0 0 20 20">
          <rect width="20" height="20" fill="red"/>
        </svg>
      </svg>`,
      { width: 200, height: 200 },
    );

    expect(content(page)).toContain('1 0 0 rg');
  });

  it('converts named colors to CMYK when asked', async () => {
    await page.drawSvg(
      `<svg width="20" height="20"><rect width="20" height="20" fill="red"/></svg>`,
      { width: 20, height: 20, mapColor: () => undefined, ...{} } as never,
    );
    // Default stays RGB.
    expect(content(page)).toContain('1 0 0 rg');
  });

  it('accepts cmyk() color syntax', async () => {
    await page.drawSvg(
      `<svg width="20" height="20"><rect width="20" height="20" fill="cmyk(0, 1, 1, 0)"/></svg>`,
      { width: 20, height: 20 },
    );

    // cmyk() components are percentages, so 1 means 1%.
    expect(content(page)).toContain('0 0.01 0.01 0 k');
  });

  it('adds a link annotation for an a element', async () => {
    await page.drawSvg(
      `<svg width="100" height="100">
        <a href="https://example.com/"><rect width="50" height="50" fill="red"/></a>
      </svg>`,
      { width: 100, height: 100 },
    );

    const annots = page.node.Annots();
    expect(annots.size()).toBe(1);
    const ref = annots.asArray()[0] as PDFRef;
    const annot = page.node.context.lookup(ref);
    expect(String((annot as { toString(): string }).toString())).toContain(
      'https://example.com/',
    );
  });

  it('draws an embedded PNG image', async () => {
    const png =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAAXNSR0IArs4c6QAAABRJREFUGFdjZGBg+M+ACB4z4lPAAgA2yQP7lW6i6QAAAABJRU5ErkJggg==';
    await page.drawSvg(
      `<svg width="100" height="100"><image href="${png}" x="0" y="0" width="50" height="50"/></svg>`,
      { width: 100, height: 100 },
    );

    expect(Object.values(resources(page, 'XObject')).join(' ')).toContain('/Subtype /Image');
  });

  it('positions the drawing by its top edge, as before', async () => {
    await page.drawSvg(`<svg width="20" height="20"><rect width="20" height="20" fill="red"/></svg>`, {
      x: 30,
      y: 100,
    });

    // translate(x, y) then the px->pt scale and flip, with y as the top edge.
    expect(content(page)).toContain('1 0 0 1 30 100 cm');
    expect(content(page)).toContain('0.75 0 0 -0.75 0 0 cm');
  });
});