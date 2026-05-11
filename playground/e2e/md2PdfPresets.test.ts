import { md2pdf } from '@pdfme/converter/md2pdf';
import { readAuthoringStarterFixtures } from './authoringStarterFixtures';

const md2PdfPresets = readAuthoringStarterFixtures('md2pdf');

describe('md2pdf playground presets', () => {
  it.each(md2PdfPresets)('converts the $label preset', async ({ source }) => {
    const result = await md2pdf(source, {
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
