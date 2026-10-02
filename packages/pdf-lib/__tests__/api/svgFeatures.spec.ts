import {
  PDFContentStream,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRef,
  StandardFonts,
} from '../../src/index';
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

  it('strokes a shape that also has a fill', async () => {
    // `f` terminates the PDF path, so `f` followed by `S` loses the stroke.
    // fill and stroke have to be a single `B`/`B*`.
    await page.drawSvg(
      `<svg width="40" height="40">
        <rect x="5" y="5" width="30" height="30" fill="red" stroke="blue" stroke-width="4"/>
      </svg>`,
      { width: 40, height: 40 },
    );

    const stream = content(page);
    expect(stream).toMatch(/\nB\n/);
    expect(stream).not.toMatch(/\nf\n/);
    expect(stream).not.toMatch(/\nS\n/);
  });

  it('selects a bold or italic font from the fonts option', async () => {
    // The old implementation matched `family_bold`, `family_italic` keys, so
    // callers rely on that naming.
    const regular = await pdfDoc.embedFont('Helvetica');
    const bold = await pdfDoc.embedFont('Helvetica-Bold');
    await page.drawSvg(
      `<svg width="100" height="100">
        <text x="10" y="50" font-family="F" font-weight="bold">B</text>
        <text x="10" y="90" font-family="F">R</text>
      </svg>`,
      { width: 100, height: 100, fonts: { F: regular, F_bold: bold } },
    );

    const fonts = page.node.Resources()?.get(PDFName.of('Font'));
    const refOf = (name: string): string => String(fonts.get(PDFName.of(name)));
    const used = [...content(page).matchAll(/\/(Font-\d+) [\d.]+ Tf/g)].map((m) => m[1]);
    expect(used).toHaveLength(2);
    expect(refOf(used[0])).toBe(bold.ref.toString());
    expect(refOf(used[1])).toBe(regular.ref.toString());
  });

  it('runs a coordinate-less linearGradient horizontally', async () => {
    await page.drawSvg(
      `<svg width="40" height="40">
        <defs><linearGradient id="g"><stop offset="0" stop-color="red"/><stop offset="1" stop-color="blue"/></linearGradient></defs>
        <rect width="40" height="40" fill="url(#g)"/>
      </svg>`,
      { width: 40, height: 40 },
    );

    let coords: string | undefined;
    for (const [, object] of page.node.context.enumerateIndirectObjects()) {
      const match = /\/Coords \[ ([^\]]+)\]/.exec(String((object as { toString(): string }).toString()).replace(/\s+/g, ' '));
      if (match) {
        coords = match[1];
        break;
      }
    }
    expect(coords).toBeDefined();
    expect(coords!.trim().split(/\s+/).map(Number)).toEqual([0, 0, 1, 0]);
  });

  it('clips mask content to the mask region', async () => {
    await page.drawSvg(
      `<svg width="60" height="60">
        <defs>
          <mask id="m" x="0" y="0" width="20" height="20" maskUnits="userSpaceOnUse">
            <rect x="0" y="0" width="60" height="60" fill="white"/>
          </mask>
        </defs>
        <rect width="60" height="60" fill="black" mask="url(#m)"/>
      </svg>`,
      { width: 60, height: 60 },
    );

    let body = '';
    const states = page.node.Resources()!.get(PDFName.of('ExtGState')) as unknown as {
      entries(): Iterable<[unknown, unknown]>;
    };
    for (const [, value] of states.entries()) {
      const resolved = value instanceof PDFRef ? page.node.context.lookup(value) : value;
      const ref = /\/G (\d+) 0 R/.exec(String((resolved as { toString(): string }).toString()));
      if (!ref) continue;
      for (const [objRef, object] of page.node.context.enumerateIndirectObjects()) {
        if (
          objRef.objectNumber === Number(ref[1]) &&
          typeof (object as { getContentsString?: () => string }).getContentsString === 'function'
        ) {
          body = (object as { getContentsString: () => string }).getContentsString();
        }
      }
    }
    // The region is clipped away before the mask's own content is painted.
    expect(body).toMatch(/0 0 20 20 re\nW\nn/);
  });

  it('does not overflow the stack on cyclic gradient or pattern href', async () => {
    await expect(
      page.drawSvg(
        `<svg width="20" height="20">
          <defs>
            <linearGradient id="a" href="#b"><stop offset="0" stop-color="red"/></linearGradient>
            <linearGradient id="b" href="#a"><stop offset="1" stop-color="blue"/></linearGradient>
            <pattern id="p1" width="10" height="10" patternUnits="userSpaceOnUse" href="#p2">
              <rect width="5" height="5" fill="red"/>
            </pattern>
            <pattern id="p2" width="10" height="10" patternUnits="userSpaceOnUse" href="#p1">
              <rect width="5" height="5" fill="blue"/>
            </pattern>
          </defs>
          <rect width="20" height="20" fill="url(#a)"/>
          <rect y="10" width="20" height="10" fill="url(#p1)"/>
        </svg>`,
        { width: 20, height: 20 },
      ),
    ).resolves.not.toThrow();
  });

  it('embeds an image given as a bare base64 payload', async () => {
    const bare =
      'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAAXNSR0IArs4c6QAAABRJREFUGFdjZGBg+M+ACB4z4lPAAgA2yQP7lW6i6QAAAABJRU5ErkJggg==';

    for (const href of [bare, `data:image/png;base64,${bare}`]) {
      const d = await PDFDocument.create();
      const p = d.addPage([200, 200]);
      await p.drawSvg(
        `<svg width="40" height="40"><image href="${href}" x="0" y="0" width="40" height="40"/></svg>`,
        { width: 40, height: 40 },
      );
      const reloadedDoc = await PDFDocument.load(await d.save());
      expect(Object.values(resources(p, 'XObject')).join(' ')).toContain('/Subtype /Image');
      void reloadedDoc;
    }
  });

  it('places a text link over the text, in page coordinates', async () => {
    // Annotations live in default page space, so the box has to go through the
    // root scale and y-flip. In user space the text is at x 40..70.8, y 50.
    const f = await pdfDoc.embedFont(StandardFonts.Helvetica);
    await page.drawSvg(
      `<svg width="200" height="100">
        <a href="https://example.com/">
          <text x="40" y="50" font-family="Helvetica" font-size="16">click</text>
        </a>
      </svg>`,
      { width: 200, height: 100, x: 20, y: 300 },
    );

    const annots = page.node.Annots();
    expect(annots.size()).toBe(1);
    const annot = page.node.context.lookup(annots.asArray()[0] as PDFRef);
    const rect = (
      /\/Rect \[([^\]]+)\]/.exec(String((annot as { toString(): string }).toString())) as RegExpExecArray
    )[1]
      .trim()
      .split(/\s+/)
      .map(Number);

    // root CTM is translate(20, 300) then scale(0.75, -0.75)
    const X = (u: number): number => 20 + u * 0.75;
    const Y = (u: number): number => 300 - u * 0.75;
    const width = f.widthOfTextAtSize('click', 16);
    expect(rect[0]).toBeCloseTo(X(40), 2);
    expect(rect[2]).toBeCloseTo(X(40 + width), 2);
    expect(rect[1]).toBeCloseTo(Y(50 + 0.207 * 16), 1);
    expect(rect[3]).toBeCloseTo(Y(50 - 0.718 * 16), 1);
  });

  it('converts a cmyk() paint to rgb before handing it to mapColor', async () => {
    let seen: { red: number; green: number; blue: number } | undefined;
    await page.drawSvg(
      `<svg width="20" height="20"><rect width="20" height="20" fill="cmyk(0, 100, 100, 0)"/></svg>`,
      {
        width: 20,
        height: 20,
        mapColor: ({ parsed }) => {
          seen = parsed.rgb;
          return undefined;
        },
      },
    );

    // cmyk(0, 100%, 100%, 0) is red.
    expect(seen!.red).toBeCloseTo(1, 6);
    expect(seen!.green).toBeCloseTo(0, 6);
    expect(seen!.blue).toBeCloseTo(0, 6);
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