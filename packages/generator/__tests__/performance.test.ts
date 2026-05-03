import generate from '../src/generate.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import {
  BLANK_PDF,
  getInputFromTemplate,
  type Schema,
  type Template,
} from '@pdfme/common';
import { getFont } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const benchmarkTest = process.env.PDFME_GENERATOR_BENCHMARK ? test : test.skip;

const measure = async (name: string, fn: () => Promise<void>) => {
  const runs: number[] = [];
  for (let i = 0; i < 6; i += 1) {
    const startedAt = performance.now();
    await fn();
    runs.push(performance.now() - startedAt);
  }

  const measuredRuns = runs.slice(1);
  const average =
    measuredRuns.reduce((total, duration) => total + duration, 0) / measuredRuns.length;

  console.info(
    `[@pdfme/generator benchmark] ${name}: ${average.toFixed(2)}ms average after warmup`,
  );
  console.info(
    `[@pdfme/generator benchmark] ${name} runs: ${runs
      .map((duration) => duration.toFixed(2))
      .join(', ')}ms`,
  );

  expect(average).toBeGreaterThan(0);
};

describe('generator performance benchmarks', () => {
  benchmarkTest(
    'measures PDF generation without image snapshot conversion',
    async () => {
      const textSchemas: Schema[] = Array.from({ length: 120 }, (_, index) => ({
        name: `field${index}`,
        type: 'text',
        content: '',
        position: { x: 10 + (index % 4) * 45, y: 10 + Math.floor(index / 4) * 8 },
        width: 40,
        height: 6,
        fontSize: 8,
      }));
      const textHeavyTemplate: Template = { basePdf: BLANK_PDF, schemas: [textSchemas] };
      const textHeavyInputs = Array.from({ length: 25 }, (_, inputIndex) =>
        Object.fromEntries(
          textSchemas.map((schema, schemaIndex) => [
            schema.name,
            `${inputIndex}-${schemaIndex}`,
          ]),
        ),
      );
      const font = getFont();

      await measure('blank text-heavy template', () =>
        generate({ inputs: textHeavyInputs, template: textHeavyTemplate, options: { font } }),
      );

      const labelTemplatePath = path.join(
        __dirname,
        '../../../playground/public/template-assets/address-label-30/template.json',
      );
      const labelTemplate = JSON.parse(fs.readFileSync(labelTemplatePath, 'utf8')) as Template;
      const baseLabelInput = getInputFromTemplate(labelTemplate)[0];
      const labelInputs = Array.from({ length: 40 }, (_, index) => ({
        ...baseLabelInput,
        '{1}Name': `Kyohei Fukuda ${index}`,
      }));

      await measure('custom base PDF multi-input template', () =>
        generate({ inputs: labelInputs, template: labelTemplate, options: { font } }),
      );
    },
    120000,
  );
});
