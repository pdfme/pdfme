import generate from '../src/generate.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BLANK_PDF, getInputFromTemplate, Template, type Schema } from '@pdfme/common';
import {
  text,
  image,
  signature,
  svg,
  line,
  rectangle,
  ellipse,
  barcodes,
  table,
  list,
  multiVariableText,
  dateTime,
  date,
  time,
  select,
  checkbox,
  radioGroup,
  circleMark,
} from '@pdfme/schemas';
import { getFont, getImageSnapshotOptions, pdfToImages } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PERFORMANCE_THRESHOLD = parseFloat(process.env.PERFORMANCE_THRESHOLD || '1.5');
const GENERATOR_BENCHMARK_THRESHOLD = parseFloat(
  process.env.GENERATOR_BENCHMARK_THRESHOLD || '2.5',
);
const GENERATOR_BENCHMARK_RUN_COUNT = 6;
const GENERATOR_BENCHMARK_WARMUP_RUN_COUNT = 1;
const ADDRESS_LABEL_BENCHMARK_INPUT_COUNT = 20;
const PLAYGROUND_TEMPLATE_PERFORMANCE_THRESHOLDS: Record<string, number> = {
  'nenkin-shougai-seishin-shindansho': 5,
  'nenkin-shougai-seishin-shindansho-initial': 5,
  'nenkin-shougai-seishin-shindansho-update': 7,
};
const generatorPlugins = {
  text,
  image,
  svg,
  line,
  rectangle,
  ellipse,
  signature,
  table,
  list,
  multiVariableText,
  dateTime,
  date,
  time,
  select,
  checkbox,
  radioGroup,
  circleMark,
  ...barcodes,
};

const checkPerformanceThreshold = (
  name: string,
  execSeconds: number,
  threshold = PERFORMANCE_THRESHOLD,
) => {
  if (process.env.CI) {
    expect(execSeconds).toBeLessThan(threshold);
  } else if (execSeconds >= threshold) {
    console.warn(
      `Warning: Execution time for ${name} is ${execSeconds} seconds, which is above the threshold of ${threshold} seconds.`,
    );
  }
};

const measureGenerate = async (name: string, fn: () => Promise<void>) => {
  const runs: number[] = [];
  for (let i = 0; i < GENERATOR_BENCHMARK_RUN_COUNT; i += 1) {
    const startedAt = process.hrtime.bigint();
    await fn();
    runs.push(Number(process.hrtime.bigint() - startedAt) / 1000000);
  }

  const measuredRuns = runs.slice(GENERATOR_BENCHMARK_WARMUP_RUN_COUNT);
  const average =
    measuredRuns.reduce((total, duration) => total + duration, 0) / measuredRuns.length;
  const sortedRuns = [...measuredRuns].sort((a, b) => a - b);
  const median = sortedRuns[Math.floor(sortedRuns.length / 2)];
  const variance =
    measuredRuns.reduce((total, duration) => total + (duration - average) ** 2, 0) /
    measuredRuns.length;
  const standardDeviation = Math.sqrt(variance);

  console.info(
    `[@pdfme/generator benchmark] ${name}: ${average.toFixed(2)}ms average, ` +
      `${median.toFixed(2)}ms median, ${standardDeviation.toFixed(2)}ms stddev after warmup`,
  );
  console.info(
    `[@pdfme/generator benchmark] ${name} runs: ${runs
      .map((duration) => duration.toFixed(2))
      .join(', ')}ms`,
  );

  expect(average).toBeGreaterThan(0);
  checkPerformanceThreshold(name, median / 1000, GENERATOR_BENCHMARK_THRESHOLD);
};

// Load all templates from playground/public/template-assets
function loadPlaygroundTemplates(): Record<string, Template> {
  const templatesDir = path.join(__dirname, '../../../playground/public/template-assets');
  const templates: Record<string, Template> = {};

  const folders = fs.readdirSync(templatesDir);

  for (const folder of folders) {
    const folderPath = path.join(templatesDir, folder);
    const stat = fs.statSync(folderPath);

    if (stat.isDirectory()) {
      const templatePath = path.join(folderPath, 'template.json');

      if (fs.existsSync(templatePath)) {
        try {
          const templateContent = fs.readFileSync(templatePath, 'utf-8');
          const template = JSON.parse(templateContent) as Template;
          templates[folder] = template;
        } catch (error) {
          console.warn(`Failed to load template from ${folder}:`, error);
        }
      }
    }
  }

  return templates;
}

describe('generate integration test(playground)', () => {
  const playgroundTemplates = loadPlaygroundTemplates();

  const RealDate = Date;
  beforeAll(() => {
    class MockDate extends RealDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super('2024-01-01T00:00:00.000Z');
        } else {
          // @ts-expect-error Allow passing arguments to Date constructor
          super(...args);
        }
      }
    }
    global.Date = MockDate as any;
  });

  afterAll(() => {
    global.Date = RealDate;
  });

  for (const [key, template] of Object.entries(playgroundTemplates)) {
    test(`snapshot ${key}`, async () => {
      const inputs = getInputFromTemplate(template);

      const font = getFont();

      const hrstart = process.hrtime();

      const pdf = await generate({
        inputs,
        template,
        plugins: generatorPlugins,
        options: { font },
      });

      const hrend = process.hrtime(hrstart);
      const execSeconds = hrend[0] + hrend[1] / 1000000000;
      checkPerformanceThreshold(key, execSeconds, PLAYGROUND_TEMPLATE_PERFORMANCE_THRESHOLDS[key]);

      const images = await pdfToImages(pdf);
      for (let i = 0; i < images.length; i++) {
        await expect(images[i]).toMatchImage(getImageSnapshotOptions(`${key}-${i + 1}`));
      }
    });
  }

  test('benchmarks generator-only paths used by performance-sensitive templates', async () => {
    const font = getFont();
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
        textSchemas.map((schema, schemaIndex) => [schema.name, `${inputIndex}-${schemaIndex}`]),
      ),
    );

    await measureGenerate('blank text-heavy template', () =>
      generate({ inputs: textHeavyInputs, template: textHeavyTemplate, options: { font } }),
    );

    const labelTemplate = playgroundTemplates['address-label-30'];
    if (!labelTemplate) {
      throw new Error('Failed to load playground template "address-label-30".');
    }
    const [baseLabelInput = {}] = getInputFromTemplate(labelTemplate);
    const labelInputs = Array.from({ length: ADDRESS_LABEL_BENCHMARK_INPUT_COUNT }, (_, index) => ({
      ...baseLabelInput,
      '{1}Name': `Kyohei Fukuda ${index}`,
    }));

    await measureGenerate(
      `playground address-label-30 ${ADDRESS_LABEL_BENCHMARK_INPUT_COUNT}-input template`,
      () =>
        generate({
          inputs: labelInputs,
          template: labelTemplate,
          plugins: generatorPlugins,
          options: { font },
        }),
    );
  }, 120000);
});
