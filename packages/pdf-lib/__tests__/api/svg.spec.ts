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
    expect(shortHex.parsed.alpha).toBe(1);

    expect(rgbCall.parsed.rgb.red).toBeCloseTo(17 / 255);
    expect(rgbCall.parsed.rgb.green).toBeCloseTo(34 / 255);
    expect(rgbCall.parsed.rgb.blue).toBeCloseTo(51 / 255);
    expect(rgbCall.parsed.alpha).toBe(1);

    expect(rgbaCall.parsed.rgb.red).toBeCloseTo(17 / 255);
    expect(rgbaCall.parsed.rgb.green).toBeCloseTo(34 / 255);
    expect(rgbaCall.parsed.rgb.blue).toBeCloseTo(51 / 255);
    expect(rgbaCall.parsed.alpha).toBe(0.5);

    expect(namedCall.parsed.rgb.red).toBe(0);
    expect(namedCall.parsed.rgb.green).toBe(0);
    expect(namedCall.parsed.rgb.blue).toBe(1);
    expect(namedCall.parsed.alpha).toBe(1);
  });
});
