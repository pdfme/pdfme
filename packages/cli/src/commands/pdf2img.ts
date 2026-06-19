import { basename, extname, join } from 'node:path';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { defineCommand } from 'citty';
import { PAGE_SIZE_PRESETS } from '@pdfme/common';
import { pdf2img, pdf2size } from '@pdfme/converter';
import {
  assertNoUnknownFlags,
  fail,
  parsePositiveNumberArg,
  printJson,
  runWithContract,
} from '../contract.js';
import { detectPaperSize, parsePageRange, readPdfFile, writeOutput } from '../utils.js';
import { drawGridOnPdfImage } from '../grid.js';

const pdf2imgArgs = {
  file: { type: 'positional' as const, description: 'Input PDF file', required: false },
  output: { type: 'string' as const, alias: 'o', description: 'Output directory' },
  grid: { type: 'boolean' as const, description: 'Overlay mm grid on images', default: false },
  gridSize: { type: 'string' as const, description: 'Grid spacing in mm', default: '10' },
  scale: { type: 'string' as const, description: 'Render scale', default: '1' },
  pages: { type: 'string' as const, description: 'Page range (e.g., 1-3, 1,3,5)' },
  verbose: { type: 'boolean' as const, alias: 'v', description: 'Verbose output', default: false },
  json: {
    type: 'boolean' as const,
    description: 'Machine-readable JSON output (includes size info)',
    default: false,
  },
};

export default defineCommand({
  meta: {
    name: 'pdf2img',
    description: 'Convert PDF pages to images',
  },
  args: pdf2imgArgs,
  async run({ args, rawArgs }) {
    return runWithContract({ json: Boolean(args.json) }, async () => {
      assertNoUnknownFlags(rawArgs, pdf2imgArgs);

      if (!args.file) {
        fail('No input PDF provided.', { code: 'EARG', exitCode: 1 });
      }

      const scale = parsePositiveNumberArg('scale', args.scale);
      const gridSize = parsePositiveNumberArg('gridSize', args.gridSize);
      const pdfData = readPdfFile(args.file);
      const sizes = await pdf2size(pdfData);

      const pageIndices = args.pages
        ? parsePageRange(args.pages, sizes.length).map((page) => page - 1)
        : Array.from({ length: sizes.length }, (_, index) => index);

      const allImages = await pdf2img(pdfData, {
        scale,
      });

      const inputBase = basename(args.file, extname(args.file));
      let outputDir = '.';

      if (args.output) {
        outputDir = args.output;
        if (existsSync(outputDir)) {
          if (!statSync(outputDir).isDirectory()) {
            fail(`Output path must be a directory for pdf2img: ${args.output}`, {
              code: 'EIO',
              exitCode: 3,
            });
          }
        } else {
          mkdirSync(outputDir, { recursive: true });
        }
      }

      if (args.verbose) {
        console.error(`Input: ${args.file}`);
        console.error(`Pages: ${sizes.length}`);
        console.error(`Selected pages: ${pageIndices.map((pageIdx) => pageIdx + 1).join(', ')}`);
        console.error(`Output: ${outputDir}`);
        console.error('Image format: png');
        console.error(`Scale: ${scale}`);
        console.error(`Grid: ${args.grid ? `enabled (${gridSize}mm)` : 'disabled'}`);
      }

      const results: Array<{
        outputPath: string;
        pageNumber: number;
        width: number;
        height: number;
      }> = [];

      for (const pageIdx of pageIndices) {
        let imageData = allImages[pageIdx];
        const size = sizes[pageIdx] ?? PAGE_SIZE_PRESETS.A4;

        if (args.grid) {
          imageData = await drawGridOnPdfImage(imageData, gridSize, size.width, size.height);
        }

        const outputPath = join(outputDir, `${inputBase}-${pageIdx + 1}.png`);
        writeOutput(outputPath, imageData);

        const paperSize = detectPaperSize(size.width, size.height);
        results.push({
          outputPath,
          pageNumber: pageIdx + 1,
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
        printJson({
          ok: true,
          command: 'pdf2img',
          pageCount: sizes.length,
          selectedPageCount: results.length,
          outputDir,
          outputPaths: results.map((result) => result.outputPath),
          pages: results,
        });
      }
    });
  },
});
