import { PDFDocument } from '@pdfme/pdf-lib';
import { Template } from '@pdfme/common';
import { list, text } from '@pdfme/schemas';
import generate from '../src/generate.js';
import { getFont } from './utils.js';

describe('generate list schema', () => {
  test('renders a dynamic list across pages', async () => {
    const template: Template = {
      basePdf: { width: 100, height: 70, padding: [10, 10, 10, 10] },
      schemas: [
        [
          {
            name: 'tasks',
            type: 'list',
            content: '[]',
            position: { x: 10, y: 10 },
            width: 70,
            height: 10,
            fontSize: 12,
            lineHeight: 1,
            characterSpacing: 0,
            fontColor: '#000000',
            backgroundColor: '',
            listStyle: 'ordered',
            markerWidth: 7,
            markerGap: 2,
            itemSpacing: 1,
          },
          {
            name: 'footer',
            type: 'text',
            content: '',
            position: { x: 10, y: 25 },
            width: 70,
            height: 8,
            fontSize: 10,
          },
        ],
      ],
    };

    const pdf = await generate({
      template,
      inputs: [
        {
          tasks: JSON.stringify(Array.from({ length: 18 }, (_, index) => `Task ${index + 1}`)),
          footer: 'Done',
        },
      ],
      plugins: { list, text },
      options: { font: getFont() },
    });
    const pdfDoc = await PDFDocument.load(pdf);

    expect(pdf.length).toBeGreaterThan(0);
    expect(pdfDoc.getPageCount()).toBeGreaterThan(1);
  });
});
