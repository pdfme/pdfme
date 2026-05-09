import { defineCommand } from 'citty';
import { assertNoUnknownFlags, fail, printJson, runWithContract } from '../contract.js';
import { writeOutput } from '../utils.js';
import {
  fetchExampleTemplateWithSource,
  getExampleManifest,
  getExamplesBaseUrl,
} from '../example-templates.js';
import { getOfficialExampleFonts } from '../example-fonts.js';

const examplesArgs = {
  name: { type: 'positional' as const, description: 'Template name to output', required: false },
  list: { type: 'boolean' as const, description: 'List available templates', default: false },
  output: { type: 'string' as const, alias: 'o', description: 'Output file path' },
  withInputs: {
    type: 'boolean' as const,
    alias: 'w',
    description: 'Output unified format with sample inputs',
    default: false,
  },
  verbose: { type: 'boolean' as const, alias: 'v', description: 'Verbose output', default: false },
  json: { type: 'boolean' as const, description: 'Machine-readable JSON output', default: false },
};

function generateSampleInputs(template: Record<string, unknown>): Record<string, string>[] {
  const fields = normalizeSchemaPages(template.schemas).flat();

  if (fields.length === 0) return [{}];

  const input: Record<string, string> = {};
  for (const schema of fields) {
    if (typeof schema !== 'object' || schema === null) continue;
    const name = schema.name as string;
    const content = schema.content as string | undefined;
    const readOnly = schema.readOnly as boolean | undefined;
    const type = schema.type as string | undefined;

    if (readOnly) continue;
    if (name) {
      input[name] = content || (type === 'image' || type === 'signature' ? '' : `Sample ${name}`);
    }
  }

  return [input];
}

export default defineCommand({
  meta: {
    name: 'examples',
    description: 'List and output example pdfme templates',
  },
  args: examplesArgs,
  async run({ args, rawArgs }) {
    return runWithContract({ json: Boolean(args.json) }, async () => {
      assertNoUnknownFlags(rawArgs, examplesArgs);

      let manifestResult;
      try {
        manifestResult = await getExampleManifest();
      } catch (error) {
        fail(
          `Failed to load examples manifest. ${error instanceof Error ? error.message : String(error)}`,
          {
            code: 'EIO',
            exitCode: 3,
            cause: error,
          },
        );
      }

      const templateEntries = manifestResult.manifest.templates;
      const templateNames = templateEntries
        .map((entry) => entry.name)
        .filter((name): name is string => typeof name === 'string' && name.length > 0)
        .sort();

      if (args.verbose) {
        console.error(`Base URL: ${getExamplesBaseUrl()}`);
        console.error(`Manifest source: ${manifestResult.source}`);
        if (manifestResult.url) {
          console.error(`Manifest URL: ${manifestResult.url}`);
        }
        console.error(`Templates: ${templateNames.length}`);
      }

      if (args.list || !args.name) {
        if (args.json) {
          printJson({
            ok: true,
            command: 'examples',
            mode: 'list',
            templateCount: templateNames.length,
            source: manifestResult.source,
            baseUrl: getExamplesBaseUrl(),
            manifest: manifestResult.manifest,
          });
        } else {
          console.log('Available templates:');
          for (const name of templateNames) {
            console.log(`  ${name}`);
          }
        }
        return;
      }

      const entry = templateEntries.find((template) => template.name === args.name);
      if (!entry) {
        fail(
          `Template "${args.name}" not found. Available templates: ${templateNames.join(', ')}`,
          {
            code: 'EARG',
            exitCode: 1,
          },
        );
      }

      let templateResult;
      try {
        templateResult = await fetchExampleTemplateWithSource(args.name, {
          manifest: manifestResult.manifest,
        });
      } catch (error) {
        fail(
          `Failed to load example template "${args.name}". ${error instanceof Error ? error.message : String(error)}`,
          {
            code: 'EIO',
            exitCode: 3,
            cause: error,
          },
        );
      }

      const output = args.withInputs
        ? buildExampleJob(templateResult.template)
        : templateResult.template;
      const mode = args.withInputs ? 'job' : 'template';
      const stats = countTemplateStats(templateResult.template);
      const inputCount = args.withInputs ? ((output.inputs as unknown[])?.length ?? 0) : undefined;

      if (args.verbose) {
        console.error(`Template: ${args.name}`);
        console.error(`Template source: ${templateResult.source}`);
        if (templateResult.url) {
          console.error(`Template URL: ${templateResult.url}`);
        }
        console.error(`Mode: ${mode}`);
        console.error(`Template pages: ${stats.templatePageCount}`);
        console.error(`Fields: ${stats.fieldCount}`);
        if (inputCount !== undefined) {
          console.error(`Inputs: ${inputCount} set(s)`);
        }
        console.error(`Output: ${args.output ?? 'stdout'}`);
      }

      if (args.output) {
        writeOutput(args.output, new TextEncoder().encode(JSON.stringify(output, null, 2)));

        if (args.json) {
          printJson({
            ok: true,
            command: 'examples',
            name: args.name,
            mode,
            source: templateResult.source,
            templatePageCount: stats.templatePageCount,
            fieldCount: stats.fieldCount,
            ...(inputCount !== undefined ? { inputCount } : {}),
            outputPath: args.output,
          });
        } else {
          const label = args.withInputs ? 'Job file' : 'Template';
          console.log(`\u2713 ${label} written to ${args.output}`);
        }
        return;
      }

      if (args.json) {
        printJson({
          ok: true,
          command: 'examples',
          name: args.name,
          source: templateResult.source,
          mode,
          templatePageCount: stats.templatePageCount,
          fieldCount: stats.fieldCount,
          ...(inputCount !== undefined ? { inputCount } : {}),
          data: output,
        });
      } else {
        console.log(JSON.stringify(output, null, 2));
      }
    });
  },
});

function buildExampleJob(template: Record<string, unknown>): Record<string, unknown> {
  const job: Record<string, unknown> = {
    template,
    inputs: generateSampleInputs(template),
  };

  const font = getOfficialExampleFonts(template);
  if (font) {
    job.options = { font };
  }

  return job;
}

function countTemplateStats(template: Record<string, unknown>): {
  templatePageCount: number;
  fieldCount: number;
} {
  const schemaPages = normalizeSchemaPages(template.schemas);
  return {
    templatePageCount: schemaPages.length,
    fieldCount: schemaPages.reduce((count, page) => count + page.length, 0),
  };
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
      return Object.entries(page)
        .map(([name, schema]) =>
          typeof schema === 'object' && schema !== null
            ? ({ ...schema, name: (schema as Record<string, unknown>).name ?? name } as Record<
                string,
                unknown
              >)
            : null,
        )
        .filter((schema): schema is Record<string, unknown> => schema !== null);
    }

    return [];
  });
}
