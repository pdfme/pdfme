// @vitest-environment node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as pdfLib from '@pdfme/pdf-lib';
import { PDFDocument } from '@pdfme/pdf-lib';
import type { Font } from '@pdfme/common';
import { pdfRender } from '../src/text/pdfRender.js';
import type { TextSchema } from '../src/text/types.js';
import fontkit from '@pdf-lib/fontkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Thai mixed-script PDF rendering visual smoke test', () => {
  it('creates a PDF for visually checking Thai tone marks in mixed Latin and Thai text', async () => {
    const thaiFontPath = path.join(__dirname, 'assets/fonts/Sarabun-Regular.ttf');

    const thaiFontData = readFileSync(thaiFontPath);

    const font = {
      Sarabun: {
        data: thaiFontData,
        fallback: true,
        subset: false,
      },
    } as Font;

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    // A4 in pt
    const page = pdfDoc.addPage([595.28, 841.89]);

    const cache = new Map<string | number, unknown>();

    const values = [
      'วันที่',
      'A วันที่',
      'ABC วันที่',
      'วันที่ A',
      'Report 1 วันที่ 12',
      'A วันที่ B วันที่ C',
    ];

    for (const [index, value] of values.entries()) {
      const schema: TextSchema = {
        name: `thai_mixed_script_${index}`,
        type: 'text',
        content: value,
        position: {
          x: 20,
          y: 25 + index * 18,
        },
        width: 170,
        height: 14,
        alignment: 'left',
        verticalAlignment: 'top',
        fontName: 'Sarabun',
        fontSize: 16,
        lineHeight: 1.2,
        characterSpacing: 0,
        fontColor: '#000000',
        backgroundColor: '',
      };

      await pdfRender({
        value,
        schema,
        pdfDoc,
        pdfLib,
        page,
        options: { font },
        basePdf: { width: 210, height: 297, padding: [0, 0, 0, 0] },
        _cache: cache,
      });
    }

    const outputDir = path.join(__dirname, 'output');
    mkdirSync(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, 'thai-mixed-script-visual.pdf');
    const pdfBytes = await pdfDoc.save();

    writeFileSync(outputPath, pdfBytes);

    expect(pdfBytes.length).toBeGreaterThan(0);
  });
});