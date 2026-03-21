import { defineCommand } from 'citty';
import { generate } from '@pdfme/generator';
import { pdf2img, pdf2size } from '@pdfme/converter';
import { checkGenerateProps, isBlankPdf } from '@pdfme/common';
import type { Template } from '@pdfme/common';
import * as schemas from '@pdfme/schemas';
import { loadInput, resolveBasePdf, getImageOutputPaths, writeOutput } from '../utils.js';
import { resolveFont } from '../fonts.js';
import { detectCJKInTemplate, detectCJKInInputs } from '../cjk-detect.js';
import { drawGridOnImage } from '../grid.js';

const allPlugins = {
  text: schemas.text,
  multiVariableText: schemas.multiVariableText,
  image: schemas.image,
  svg: schemas.svg,
  table: schemas.table,
  ...schemas.barcodes,
  line: schemas.line,
  rectangle: schemas.rectangle,
  ellipse: schemas.ellipse,
  dateTime: schemas.dateTime,
  date: schemas.date,
  time: schemas.time,
  select: schemas.select,
  radioGroup: schemas.radioGroup,
  checkbox: schemas.checkbox,
};

export default defineCommand({
  meta: {
    name: 'generate',
    description: 'Generate PDF from template and inputs',
  },
  args: {
    file: { type: 'positional', description: 'Unified JSON file: { template, inputs }', required: false },
    template: { type: 'string', alias: 't', description: 'Template JSON file' },
    inputs: { type: 'string', alias: 'i', description: 'Input data JSON file' },
    output: { type: 'string', alias: 'o', description: 'Output PDF path', default: 'output.pdf' },
    image: { type: 'boolean', description: 'Also output PNG images per page', default: false },
    imageFormat: { type: 'string', description: 'Image format: png | jpeg', default: 'png' },
    scale: { type: 'string', description: 'Image render scale', default: '1' },
    grid: { type: 'boolean', description: 'Overlay grid + schema boundaries on images', default: false },
    gridSize: { type: 'string', description: 'Grid spacing in mm', default: '10' },
    // Note: citty does not support repeated string args natively.
    // For multiple fonts, use a comma-separated value: --font "A=a.ttf,B=b.ttf"
    font: { type: 'string', description: 'Custom font(s): name=path (comma-separated for multiple)' },
    basePdf: { type: 'string', description: 'Override basePdf with PDF file path' },
    noAutoFont: { type: 'boolean', description: 'Disable automatic CJK font download', default: false },
    verbose: { type: 'boolean', alias: 'v', description: 'Verbose output', default: false },
    json: { type: 'boolean', description: 'Machine-readable JSON output', default: false },
  },
  async run({ args }) {
    const { template: rawTemplate, inputs, templateDir } = loadInput({
      _: args.file ? [args.file] : [],
      template: args.template,
      inputs: args.inputs,
    });

    const template = resolveBasePdf(
      rawTemplate,
      args.basePdf,
      templateDir,
    ) as unknown as Template;

    try {
      checkGenerateProps({ template, inputs });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error: Invalid generation input.\n${message}`);
      process.exit(1);
    }

    // Parse --font: supports comma-separated "A=a.ttf,B=b.ttf"
    const fontArgs = args.font ? args.font.split(',').map((s: string) => s.trim()) : undefined;

    const hasCJK = detectCJKInTemplate(template as any) || detectCJKInInputs(inputs);
    const font = await resolveFont(
      fontArgs,
      hasCJK,
      args.noAutoFont,
      args.verbose,
    );

    if (args.verbose) {
      console.error(`Template: ${template.schemas?.length ?? 0} page(s)`);
      console.error(`Inputs: ${inputs.length} set(s)`);
      console.error(`Fonts: ${Object.keys(font).join(', ')}`);
    }

    try {
      const pdf = await generate({
        template,
        inputs,
        options: { font },
        plugins: allPlugins as Record<string, any>,
      });

      writeOutput(args.output, pdf);

      const result: Record<string, unknown> = {
        pdf: args.output,
        size: pdf.byteLength,
      };

      if (args.image || args.grid) {
        const scale = Number.parseFloat(args.scale);
        const imageFormat = args.imageFormat as 'png' | 'jpeg';
        const images = await pdf2img(pdf, { scale, imageType: imageFormat });
        const imagePaths = getImageOutputPaths(args.output, images.length, args.imageFormat);

        // Actual page count from rendered images (accounts for dynamic layouts)
        result.pages = images.length;

        // Resolve page dimensions for grid overlay.
        // For custom PDF basePdf, use pdf2size to get actual dimensions.
        let pageSizes: Array<{ width: number; height: number }> | null = null;

        if (args.grid) {
          const gridSize = Number.parseFloat(args.gridSize);

          if (isBlankPdf(template.basePdf)) {
            const bpdf = template.basePdf as { width: number; height: number };
            pageSizes = images.map(() => ({ width: bpdf.width, height: bpdf.height }));
          } else {
            // Custom PDF: get actual page sizes from the generated PDF
            pageSizes = await pdf2size(pdf);
          }

          for (let i = 0; i < images.length; i++) {
            const templateSchemas = template.schemas ?? [];
            const templatePageIndex = i % templateSchemas.length;
            const pageSchemas = (templateSchemas[templatePageIndex] ?? []) as Array<{
              name: string;
              type: string;
              position: { x: number; y: number };
              width: number;
              height: number;
            }>;

            const size = pageSizes[i] ?? pageSizes[0] ?? { width: 210, height: 297 };

            const gridImage = await drawGridOnImage(
              images[i],
              pageSchemas,
              gridSize,
              size.width,
              size.height,
              imageFormat,
            );
            writeOutput(imagePaths[i], gridImage);
          }
        } else {
          for (let i = 0; i < images.length; i++) {
            writeOutput(imagePaths[i], images[i]);
          }
        }

        result.images = imagePaths;
      } else {
        // Without --image, estimate page count from template structure
        result.pages = template.schemas?.length
          ? inputs.length * template.schemas.length
          : 0;
      }

      if (args.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`\u2713 PDF: ${args.output} (${formatBytes(pdf.byteLength)})`);
        if (result.images) {
          for (const img of result.images as string[]) {
            console.log(`\u2713 Image: ${img}`);
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error: PDF generation failed.\n${message}`);
      process.exit(2);
    }
  },
});

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
