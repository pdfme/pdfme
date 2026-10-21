import { cmyk, PDFContentStream, PDFDocument } from '../../src/index';
import type { PDFPage } from '../../src/index';

const getPageContent = (page: PDFPage) => {
  const contents = page.node.normalizedEntries().Contents;
  if (!contents) return '';

  const streams = [];
  for (let idx = 0; idx < contents.size(); idx++) {
    streams.push(contents.lookup(idx, PDFContentStream).getContentsString());
  }
  return streams.join('\n');
};

describe('PDFPage.drawSvg', () => {
  it('uses mapped CMYK colors for SVG fills, strokes, and text fills', async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([100, 100]);
    const mapColor = vi.fn(() => ({ color: cmyk(0, 0, 0, 1) }));

    await page.drawSvg(
      `<svg width="20" height="30">
        <rect width="10" height="10" fill="#000000"/>
        <path d="M0 15L10 15" stroke="#000000" stroke-width="1" fill="none"/>
        <text x="0" y="25" fill="#112233">A</text>
      </svg>`,
      { mapColor },
    );

    const content = getPageContent(page);

    expect(content).toContain('0 0 0 1 k');
    expect(content).toContain('0 0 0 1 K');
    expect(content).not.toMatch(/\srg\n/);
    expect(content).not.toMatch(/\sRG\n/);
    expect(mapColor).toHaveBeenCalledWith(
      expect.objectContaining({
        color: '#000000',
        kind: 'fill',
      }),
    );
    expect(mapColor).toHaveBeenCalledWith(
      expect.objectContaining({
        color: '#000000',
        kind: 'stroke',
      }),
    );
    expect(mapColor).toHaveBeenCalledWith(
      expect.objectContaining({
        color: '#112233',
        kind: 'fill',
      }),
    );
  });

  it('keeps the default SVG color path as RGB when no mapper is supplied', async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([100, 100]);

    await page.drawSvg(
      `<svg width="10" height="10">
        <rect width="10" height="10" fill="#112233" stroke="#445566" stroke-width="1"/>
      </svg>`,
    );

    const content = getPageContent(page);

    expect(content).toContain('0.06666666666666667 0.13333333333333333 0.2 rg');
    expect(content).toContain('0.26666666666666666 0.3333333333333333 0.4 RG');
    expect(content).not.toMatch(/\sk\n/);
    expect(content).not.toMatch(/\sK\n/);
  });

  it('passes parsed CSS color values and alpha to the color mapper', async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([100, 100]);
    const mapColor = vi.fn(({ parsed }) => ({ color: cmyk(0, 0, 0, 1), alpha: parsed.alpha }));

    await page.drawSvg(
      `<svg width="40" height="10">
        <rect x="0" width="10" height="10" fill="#abc"/>
        <rect x="10" width="10" height="10" fill="rgb(17, 34, 51)"/>
        <rect x="20" width="10" height="10" fill="rgba(17, 34, 51, 0.5)"/>
        <rect x="30" width="10" height="10" fill="blue"/>
      </svg>`,
      { mapColor },
    );

    expect(mapColor).toHaveBeenCalledTimes(4);

    const [shortHex, rgbCall, rgbaCall, namedCall] = mapColor.mock.calls.map(([call]) => call);
    expect(shortHex.parsed.rgb.red).toBeCloseTo(0xaa / 255);
    expect(shortHex.parsed.rgb.green).toBeCloseTo(0xbb / 255);
    expect(shortHex.parsed.rgb.blue).toBeCloseTo(0xcc / 255);
    expect(shortHex.parsed.alpha).toBeUndefined();

    expect(rgbCall.parsed.rgb.red).toBeCloseTo(17 / 255);
    expect(rgbCall.parsed.rgb.green).toBeCloseTo(34 / 255);
    expect(rgbCall.parsed.rgb.blue).toBeCloseTo(51 / 255);
    expect(rgbCall.parsed.alpha).toBeUndefined();

    expect(rgbaCall.parsed.rgb.red).toBeCloseTo(17 / 255);
    expect(rgbaCall.parsed.rgb.green).toBeCloseTo(34 / 255);
    expect(rgbaCall.parsed.rgb.blue).toBeCloseTo(51 / 255);
    expect(rgbaCall.parsed.alpha).toBe(0.5);

    expect(namedCall.parsed.rgb.red).toBe(0);
    expect(namedCall.parsed.rgb.green).toBe(0);
    expect(namedCall.parsed.rgb.blue).toBe(1);
    expect(namedCall.parsed.alpha).toBeUndefined();
  });

  it('keeps mapped CMYK components separate from SVG alpha', async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([100, 100]);

    await page.drawSvg(
      '<svg width="10" height="10"><rect width="10" height="10" fill="rgba(17, 34, 51, 0.5)"/></svg>',
      {
        mapColor: ({ parsed }) => ({
          color: cmyk(1, 0, 0, 0),
          alpha: parsed.alpha,
        }),
      },
    );

    const content = getPageContent(page);

    expect(content).toContain('1 0 0 0 k');
    expect(content).toMatch(/\/GS-\d+ gs/);
    expect(content).not.toContain('0.5 0 0 0 k');
  });

  it('does not map none or transparent paints but maps currentColor fallback', async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([100, 100]);
    const mapColor = vi.fn(() => ({ color: cmyk(0, 0, 0, 1) }));

    await page.drawSvg(
      `<svg width="20" height="10">
        <rect width="10" height="10" fill="none" stroke="transparent"/>
        <path d="M10 0L20 0" stroke="currentColor" fill="none"/>
      </svg>`,
      { mapColor },
    );

    const content = getPageContent(page);

    expect(content).toContain('0 0 0 1 K');
    expect(mapColor).toHaveBeenCalledTimes(1);
    expect(mapColor).toHaveBeenCalledWith(
      expect.objectContaining({
        color: '#000000',
        kind: 'stroke',
      }),
    );
  });

  it('applies stroke-dasharray and stroke-dashoffset to stroked shapes', async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([100, 100]);

    await page.drawSvg(
      `<svg width="40" height="40">
        <line x1="0" y1="0" x2="10" y2="0" stroke="#000" stroke-dasharray="4 2" stroke-dashoffset="1"/>
        <path d="M0 5L10 5" stroke="#000" fill="none" stroke-dasharray="4,2" stroke-dashoffset="1"/>
        <rect width="10" height="10" stroke="#000" style="stroke-dasharray: 4, 2; stroke-dashoffset: 1"/>
        <circle cx="20" cy="20" r="5" stroke="#000" stroke-dasharray="4 2" stroke-dashoffset="1"/>
        <polygon points="0,0 10,0 10,10" stroke="#000" stroke-dasharray="4 2" stroke-dashoffset="1"/>
      </svg>`,
    );

    const content = getPageContent(page);

    expect(content.match(/\[4 2\] 1 d/g) ?? []).toHaveLength(5);
    expect(content).not.toContain('[] 0 d');
  });

  it('inherits dash patterns from groups and lets children reset them', async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([100, 100]);

    await page.drawSvg(
      `<svg width="20" height="20">
        <g stroke="#000" stroke-dasharray="3" stroke-dashoffset="-1">
          <path d="M0 0L10 0" fill="none"/>
          <path d="M0 5L10 5" fill="none" stroke-dasharray="none"/>
          <path d="M0 10L10 10" fill="none" stroke-dasharray="10%"/>
        </g>
      </svg>`,
    );

    const content = getPageContent(page);

    // An odd-length list is repeated, and a negative offset is wrapped into the pattern.
    expect(content).toContain('[3 3] 5 d');
    expect(content).toContain('[] 0 d');
    // Percentages refer to the normalized diagonal of the 20x20 viewport.
    expect(content).toContain('[2 2] 3 d');
  });

  it('draws solid strokes for zero-length or invalid dash arrays', async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([100, 100]);

    await page.drawSvg(
      `<svg width="20" height="20">
        <path d="M0 0L10 0" stroke="#000" fill="none" stroke-dasharray="0 0"/>
        <path d="M0 5L10 5" stroke="#000" fill="none" stroke-dasharray="4 -2"/>
        <path d="M0 10L10 10" stroke="#000" fill="none" stroke-dasharray="4 abc"/>
      </svg>`,
    );

    const content = getPageContent(page);

    expect(content.match(/\[\] 0 d/g) ?? []).toHaveLength(3);
  });

  it('resolves dash percentages against the nearest viewport of the stroked element', async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([200, 200]);

    await page.drawSvg(
      `<svg width="100" height="100">
        <path d="M0 0L10 0" stroke="#000" fill="none" stroke-dasharray="10%" stroke-dashoffset="5%"/>
        <svg width="20" height="20" viewBox="0 0 20 20" stroke-dasharray="10%" stroke-dashoffset="5%">
          <path d="M0 5L10 5" stroke="#000" fill="none"/>
        </svg>
        <g stroke-dasharray="20%" stroke-dashoffset="15%">
          <svg width="20" height="20" viewBox="0 0 20 20">
            <path d="M0 10L10 10" stroke="#000" fill="none"/>
          </svg>
        </g>
      </svg>`,
    );

    const content = getPageContent(page);

    expect(content).toContain('[10 10] 5 d');
    // Inherited percentages are resolved against the nested 20x20 viewport.
    expect(content).toContain('[2 2] 1 d');
    expect(content).toContain('[4 4] 3 d');
  });

  it('ignores dash declarations with trailing garbage after a number', async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([100, 100]);

    await page.drawSvg(
      `<svg width="20" height="20">
        <g stroke="#000" stroke-dasharray="3" stroke-dashoffset="1">
          <path d="M0 0L10 0" fill="none" stroke-dasharray="4 2abc"/>
          <path d="M0 5L10 5" fill="none" stroke-dashoffset="2abc"/>
          <path d="M0 10L10 10" fill="none" stroke-dasharray="4px, 2" stroke-dashoffset="1px"/>
        </g>
      </svg>`,
    );

    const content = getPageContent(page);

    // Invalid declarations are ignored, so the inherited pattern and offset apply.
    expect(content.match(/\[3 3\] 1 d/g) ?? []).toHaveLength(2);
    expect(content).toContain('[4 2] 1 d');
  });

  it('ignores non-finite dash lengths and offsets', async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([100, 100]);

    await page.drawSvg(
      `<svg width="20" height="20">
        <g stroke="#000" stroke-dasharray="3" stroke-dashoffset="1">
          <line x1="0" y1="0" x2="10" y2="0" stroke-dashoffset="Infinity"/>
          <path d="M0 5L10 5" fill="none" stroke-dasharray="4 1e999"/>
          <path d="M0 10L10 10" fill="none" stroke-dasharray="4 Infinity"/>
        </g>
      </svg>`,
    );

    const content = getPageContent(page);

    expect(content.match(/\[3 3\] 1 d/g) ?? []).toHaveLength(3);
    expect(content).not.toContain('NaN');
  });

  it('rejects long invalid dash tokens quickly', async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([100, 100]);
    const token = `${'1'.repeat(100_000)}x`;

    const start = Date.now();
    await page.drawSvg(
      `<svg width="20" height="20">
        <g stroke="#000" stroke-dasharray="3" stroke-dashoffset="1">
          <path d="M0 0L10 0" fill="none" stroke-dasharray="${token}"/>
          <path d="M0 5L10 5" fill="none" stroke-dashoffset="${token}"/>
        </g>
      </svg>`,
    );
    const elapsed = Date.now() - start;

    const content = getPageContent(page);

    // The invalid tokens are ignored, so the inherited pattern and offset apply.
    expect(content.match(/\[3 3\] 1 d/g) ?? []).toHaveLength(2);
    expect(elapsed).toBeLessThan(1000);
  });

  it('accepts none in any case', async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([100, 100]);

    await page.drawSvg(
      `<svg width="20" height="20">
        <g stroke="#000" stroke-dasharray="3">
          <path d="M0 0L10 0" fill="none" stroke-dasharray="NONE"/>
        </g>
      </svg>`,
    );

    expect(getPageContent(page)).not.toContain('[3 3]');
  });
});
