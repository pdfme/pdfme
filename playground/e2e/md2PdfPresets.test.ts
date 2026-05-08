import { md2pdf } from '@pdfme/converter/md2pdf';
import { md2PdfPresets } from '../src/routes/md2PdfPresets';

describe('md2pdf playground presets', () => {
  it.each(md2PdfPresets)('converts the $label preset', async ({ markdown }) => {
    const result = await md2pdf(markdown, {
      style: {
        fontName: 'NotoSansJP',
        lineHeight: 1.3,
      },
    });

    expect(result.inputs).toEqual([{}]);
    expect(result.template.schemas.length).toBeGreaterThan(0);
    expect(result.template.schemas[0]?.length).toBeGreaterThan(0);
  });
});
