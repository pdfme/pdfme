import { dirname, basename, extname, join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { defineCommand } from 'citty';
import { pdf2img, pdf2size } from '@pdfme/converter';
import { readPdfFile, writeOutput, detectPaperSize, parsePageRange } from '../utils.js';
import { drawGridOnPdfImage } from '../grid.js';

export default defineCommand({
  meta: {
    name: 'pdf2img',
    description: 'Convert PDF pages to images',
  },
  args: {
    file: { type: 'positional', description: 'Input PDF file', required: true },
    output: { type: 'string', alias: 'o', description: 'Output directory or pattern' },
    grid: { type: 'boolean', description: 'Overlay mm grid on images', default: false },
    gridSize: { type: 'string', description: 'Grid spacing in mm', default: '10' },
    scale: { type: 'string', description: 'Render scale', default: '1' },
    imageFormat: { type: 'string', description: 'Image format: png | jpeg', default: 'png' },
    pages: { type: 'string', description: 'Page range (e.g., 1-3, 1,3,5)' },
    json: { type: 'boolean', description: 'Machine-readable JSON output (includes size info)', default: false },
  },
  async run({ args }) {
    const pdfData = readPdfFile(args.file);
    const scale = Number.parseFloat(args.scale);
    const imageFormat = args.imageFormat as 'png' | 'jpeg';

    // Get page sizes
    const sizes = await pdf2size(pdfData);

    // Determine which pages to convert
    let pageIndices: number[];
    if (args.pages) {
      const requested = parsePageRange(args.pages, sizes.length);
      pageIndices = requested.map((p) => p - 1); // 0-based
    } else {
      pageIndices = Array.from({ length: sizes.length }, (_, i) => i);
    }

    // Convert to images
    const allImages = await pdf2img(pdfData, {
      scale,
      imageType: imageFormat,
    });

    // Determine output paths
    const inputBase = basename(args.file, extname(args.file));
    const ext = imageFormat === 'jpeg' ? 'jpg' : 'png';
    let outputDir = '.';

    if (args.output) {
      outputDir = args.output;
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }
    }

    const results: Array<{ image: string; page: number; width: number; height: number }> = [];

    for (const pageIdx of pageIndices) {
      if (pageIdx >= allImages.length) continue;

      let imageData = allImages[pageIdx];
      const size = sizes[pageIdx] ?? { width: 210, height: 297 };

      if (args.grid) {
        const gridSize = Number.parseFloat(args.gridSize);
        imageData = await drawGridOnPdfImage(
          imageData,
          gridSize,
          size.width,
          size.height,
          imageFormat,
        );
      }

      const outputPath = join(outputDir, `${inputBase}-${pageIdx + 1}.${ext}`);
      writeOutput(outputPath, imageData);

      const paperSize = detectPaperSize(size.width, size.height);
      results.push({
        image: outputPath,
        page: pageIdx + 1,
        width: Math.round(size.width * 100) / 100,
        height: Math.round(size.height * 100) / 100,
      });

      if (!args.json) {
        const sizeLabel = paperSize ? `, ${paperSize}` : '';
        console.log(
          `\u2713 ${outputPath} (${size.width.toFixed(0)}\u00d7${size.height.toFixed(0)}mm${sizeLabel})`,
        );
      }
    }

    if (args.json) {
      console.log(JSON.stringify({ pages: results }, null, 2));
    }
  },
});
