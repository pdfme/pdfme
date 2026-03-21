import { defineCommand } from 'citty';
import { pdf2size } from '@pdfme/converter';
import { readPdfFile, detectPaperSize } from '../utils.js';

export default defineCommand({
  meta: {
    name: 'pdf2size',
    description: 'Get page dimensions of a PDF file',
  },
  args: {
    file: { type: 'positional', description: 'Input PDF file', required: true },
    json: { type: 'boolean', description: 'Machine-readable JSON output', default: false },
  },
  async run({ args }) {
    const pdfData = readPdfFile(args.file);
    const sizes = await pdf2size(pdfData);

    if (args.json) {
      const result = sizes.map((s, i) => ({
        page: i + 1,
        width: Math.round(s.width * 100) / 100,
        height: Math.round(s.height * 100) / 100,
      }));
      console.log(JSON.stringify(result, null, 2));
    } else {
      for (let i = 0; i < sizes.length; i++) {
        const s = sizes[i];
        const paperSize = detectPaperSize(s.width, s.height);
        const sizeLabel = paperSize ? ` (${paperSize})` : '';
        console.log(
          `Page ${i + 1}: ${s.width.toFixed(0)} \u00d7 ${s.height.toFixed(0)} mm${sizeLabel}`,
        );
      }
    }
  },
});
