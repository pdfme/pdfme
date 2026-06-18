import { defineCommand } from 'citty';
import { PDFDocument } from '@pdfme/pdf-lib';
import { generate } from '@pdfme/generator';
import { pdf2img, pdf2size } from '@pdfme/converter';
import { PAGE_SIZE_PRESETS, checkGenerateProps } from '@pdfme/common';
import type { Font, GenerateProps, Template } from '@pdfme/common';
import {
  assertNoUnknownFlags,
  fail,
  parsePositiveNumberArg,
  printJson,
  runWithContract,
} from '../contract.js';
import { validateInputContracts } from '../diagnostics.js';
import {
  ensureSafeDefaultOutputPath,
  getImageOutputPaths,
  loadInput,
  resolveBasePdf,
  writeOutput,
} from '../utils.js';
import { normalizeExplicitFontOption, resolveFont } from '../fonts.js';
import { detectCJKInTemplate, detectCJKInInputs } from '../cjk-detect.js';
import { drawGridOnImage } from '../grid.js';
import { schemaPlugins, schemaTypes } from '../schema-plugins.js';

const generateArgs = {
  file: {
    type: 'positional' as const,
    description: 'Unified JSON file: { template, inputs }',
    required: false,
  },
  template: { type: 'string' as const, alias: 't', description: 'Template JSON file' },
  inputs: { type: 'string' as const, alias: 'i', description: 'Input data JSON file' },
  output: {
    type: 'string' as const,
    alias: 'o',
    description: 'Output PDF path',
    default: 'output.pdf',
  },
  force: {
    type: 'boolean' as const,
    description: 'Allow overwriting the implicit default output path',
    default: false,
  },
  image: {
    type: 'boolean' as const,
    description: 'Also output PNG images per page',
    default: false,
  },
  scale: { type: 'string' as const, description: 'Image render scale', default: '1' },
  grid: {
    type: 'boolean' as const,
    description: 'Overlay grid + schema boundaries on images',
    default: false,
  },
  gridSize: { type: 'string' as const, description: 'Grid spacing in mm', default: '10' },
  font: {
    type: 'string' as const,
    description: 'Custom font(s): name=path (comma-separated for multiple)',
  },
  basePdf: { type: 'string' as const, description: 'Override basePdf with PDF file path' },
  noAutoFont: {
    type: 'boolean' as const,
    description: 'Disable automatic CJK font download',
    default: false,
  },
  verbose: { type: 'boolean' as const, alias: 'v', description: 'Verbose output', default: false },
  json: { type: 'boolean' as const, description: 'Machine-readable JSON output', default: false },
};

export default defineCommand({
  meta: {
    name: 'generate',
    description: 'Generate PDF from template and inputs',
  },
  args: generateArgs,
  async run({ args, rawArgs }) {
    return runWithContract({ json: Boolean(args.json) }, async () => {
      assertNoUnknownFlags(rawArgs, generateArgs);

      const scale = parsePositiveNumberArg('scale', args.scale);
      const gridSize = parsePositiveNumberArg('gridSize', args.gridSize);

      ensureSafeDefaultOutputPath({
        filePath: args.output,
        rawArgs,
        optionName: 'output',
        optionAlias: 'o',
        defaultValue: 'output.pdf',
        force: Boolean(args.force),
      });

      const {
        template: rawTemplate,
        inputs,
        options: rawJobOptions,
        templateDir,
      } = loadInput({
        _: args.file ? [args.file] : [],
        template: args.template,
        inputs: args.inputs,
      });

      const template = resolveBasePdf(
        rawTemplate,
        args.basePdf,
        templateDir,
      ) as unknown as Template;
      const mode = args.file ? 'job' : 'template+inputs';
      const templatePageCount = normalizeSchemaPages(template.schemas).length;
      const jobOptions = normalizeJobOptions(rawJobOptions);
      assertSupportedSchemaTypes(template);

      const fontArgs = args.font
        ? args.font
            .split(',')
            .map((value: string) => value.trim())
            .filter(Boolean)
        : undefined;

      const hasCJK = detectCJKInTemplate(template as any) || detectCJKInInputs(inputs);
      const resolvedFont = await resolveFont({
        fontArgs,
        hasCJK,
        noAutoFont: Boolean(args.noAutoFont),
        verbose: Boolean(args.verbose),
        hasExplicitFontConfig: hasExplicitFontEntries(jobOptions.font),
      });
      const mergedFontConfig = mergeFontConfig(jobOptions.font, resolvedFont);
      const font =
        (await normalizeExplicitFontOption(mergedFontConfig, templateDir)) ?? resolvedFont;
      const generateOptions = { ...jobOptions, font };

      try {
        checkGenerateProps({ template, inputs, options: generateOptions });
      } catch (error) {
        fail(
          `Invalid generation input. ${error instanceof Error ? error.message : String(error)}`,
          {
            code: 'EVALIDATE',
            exitCode: 1,
            cause: error,
          },
        );
      }

      validateInputContracts(template as unknown as Record<string, unknown>, inputs);

      if (args.verbose) {
        console.error(`Input: ${describeGenerateInput(args.file, args.template, args.inputs)}`);
        console.error(`Mode: ${mode}`);
        console.error(`Template pages: ${templatePageCount}`);
        console.error(`Inputs: ${inputs.length} set(s)`);
        console.error(`Output: ${args.output}`);
        console.error(
          `Images: ${
            args.image || args.grid
              ? `enabled (png, scale=${scale}, grid=${args.grid ? `${gridSize}mm` : 'disabled'})`
              : 'disabled'
          }`,
        );
        console.error(`Fonts: ${Object.keys(font).join(', ')}`);
        if (args.basePdf) {
          console.error(`Base PDF override: ${args.basePdf}`);
        }
      }

      const pdf = await generate({
        template,
        inputs,
        options: generateOptions,
        plugins: schemaPlugins as NonNullable<GenerateProps['plugins']>,
      });

      const generatedPdf = await PDFDocument.load(pdf, { updateMetadata: false });
      const pageCount = generatedPdf.getPageCount();

      writeOutput(args.output, pdf);

      const result: Record<string, unknown> = {
        command: 'generate',
        mode,
        templatePageCount,
        inputCount: inputs.length,
        pageCount,
        outputPath: args.output,
        outputBytes: pdf.byteLength,
      };

      if (args.image || args.grid) {
        const images = await pdf2img(pdf, { scale });
        const imagePaths = getImageOutputPaths(args.output, images.length);

        if (args.grid) {
          const renderedPageSizes = await pdf2size(pdf);

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

            const size = renderedPageSizes[i] ?? renderedPageSizes[0] ?? PAGE_SIZE_PRESETS.A4;

            const gridImage = await drawGridOnImage(
              images[i],
              pageSchemas,
              gridSize,
              size.width,
              size.height,
            );
            writeOutput(imagePaths[i], gridImage);
          }
        } else {
          for (let i = 0; i < images.length; i++) {
            writeOutput(imagePaths[i], images[i]);
          }
        }

        result.imagePaths = imagePaths;
      }

      if (args.json) {
        printJson({ ok: true, ...result });
      } else {
        console.log(`\u2713 Output: ${args.output} (${formatBytes(pdf.byteLength)})`);
        if (result.imagePaths) {
          for (const img of result.imagePaths as string[]) {
            console.log(`\u2713 Image: ${img}`);
          }
        }
      }
    });
  },
});

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function normalizeJobOptions(rawJobOptions: unknown): Record<string, unknown> {
  if (rawJobOptions === undefined) {
    return {};
  }

  if (typeof rawJobOptions !== 'object' || rawJobOptions === null || Array.isArray(rawJobOptions)) {
    fail('Unified job options must be a JSON object.', {
      code: 'EARG',
      exitCode: 1,
    });
  }

  return rawJobOptions as Record<string, unknown>;
}

function mergeFontConfig(jobFont: unknown, resolvedFont: Font): Font {
  if (jobFont === undefined) {
    return resolvedFont;
  }

  if (typeof jobFont !== 'object' || jobFont === null || Array.isArray(jobFont)) {
    fail('Unified job options.font must be an object.', {
      code: 'EARG',
      exitCode: 1,
    });
  }

  return {
    ...(jobFont as Font),
    ...resolvedFont,
  };
}

function hasExplicitFontEntries(jobFont: unknown): boolean {
  if (typeof jobFont !== 'object' || jobFont === null || Array.isArray(jobFont)) {
    return false;
  }

  return Object.keys(jobFont as Record<string, unknown>).length > 0;
}

function assertSupportedSchemaTypes(template: Template): void {
  const unsupported: string[] = [];

  for (const page of normalizeSchemaPages(template.schemas)) {
    for (const schema of page) {
      const type = schema.type;
      if (typeof type === 'string' && !schemaTypes.has(type)) {
        const name = typeof schema.name === 'string' && schema.name.length > 0 ? schema.name : null;
        unsupported.push(
          name ? `Field "${name}" has unknown type "${type}"` : `Unknown schema type "${type}"`,
        );
      }
    }
  }

  if (unsupported.length > 0) {
    fail(`Invalid generation input. ${unsupported.join('; ')}`, {
      code: 'EVALIDATE',
      exitCode: 1,
    });
  }
}

function describeGenerateInput(
  file: string | undefined,
  template: string | undefined,
  inputs: string | undefined,
): string {
  if (file) {
    return file;
  }

  if (template || inputs) {
    return `${template ?? '(missing template)'} + ${inputs ?? '(missing inputs)'}`;
  }

  return '(unknown)';
}

function normalizeSchemaPages(rawSchemas: unknown): Array<Array<Record<string, unknown>>> {
  if (!Array.isArray(rawSchemas)) {
    return [];
  }

  return rawSchemas.map((page) => {
    if (Array.isArray(page)) {
      return page.filter(
        (schema): schema is Record<string, unknown> =>
          typeof schema === 'object' && schema !== null,
      );
    }

    if (typeof page === 'object' && page !== null) {
      return Object.values(page).filter(
        (schema): schema is Record<string, unknown> =>
          typeof schema === 'object' && schema !== null,
      );
    }

    return [];
  });
}
