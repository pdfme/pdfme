import generate from '../src/generate.js';
import { Template } from '@pdfme/common';
import { getInputFromTemplate } from '@pdfme/common';
import {
  text,
  image,
  svg,
  line,
  rectangle,
  ellipse,
  barcodes,
  table,
  multiVariableText,
} from '@pdfme/schemas';
import { getFont, pdfToImages } from './utils.js';
import * as fs from 'fs';
import * as path from 'path';
import 'jest-image-snapshot';

const signature = {
  pdf: image.pdf,
  ui: () => {},
  propPanel: {
    ...image.propPanel,
    defaultSchema: {
      ...image.propPanel.defaultSchema,
      type: 'signature',
    },
  },
};

const PERFORMANCE_THRESHOLD = parseFloat(process.env.PERFORMANCE_THRESHOLD || '1.5');

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

  describe.each([playgroundTemplates])('%s', (templateData) => {
    const entries = Object.entries(templateData);
    for (let l = 0; l < entries.length; l += 1) {
      const [key, template] = entries[l];

      // eslint-disable-next-line no-loop-func
      test(`snapshot ${key}`, async () => {
        const inputs = getInputFromTemplate(template);

        const font = getFont();

        const hrstart = process.hrtime();

        const pdf = await generate({
          inputs,
          template,
          plugins: {
            text,
            image,
            svg,
            line,
            rectangle,
            ellipse,
            signature,
            table,
            multiVariableText,
            ...barcodes,
          },
          options: { font },
        });

        const hrend = process.hrtime(hrstart);
        const execSeconds = hrend[0] + hrend[1] / 1000000000;
        if (process.env.CI) {
          expect(execSeconds).toBeLessThan(PERFORMANCE_THRESHOLD);
        } else if (execSeconds >= PERFORMANCE_THRESHOLD) {
          console.warn(
            `Warning: Execution time for ${key} is ${execSeconds} seconds, which is above the threshold of ${PERFORMANCE_THRESHOLD} seconds.`,
          );
        }

        const images = await pdfToImages(pdf);
        for (let i = 0; i < images.length; i++) {
          expect(images[i]).toMatchImageSnapshot({
            customSnapshotIdentifier: `${key}-${i + 1}`,
            failureThreshold: 0.001, // Allow 0.1% pixel difference
            failureThresholdType: 'percent' as const,
          });
        }
      });
    }
  });
});
