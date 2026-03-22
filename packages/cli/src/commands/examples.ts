import { defineCommand } from 'citty';
import { writeOutput } from '../utils.js';
import { getExampleTemplateNames, fetchExampleTemplate, getExamplesBaseUrl } from '../example-templates.js';

async function loadTemplate(name: string): Promise<Record<string, unknown>> {
  try {
    return await fetchExampleTemplate(name);
  } catch (error) {
    const available = await getExampleTemplateNames();
    const fallbackHint = available.length > 0 ? `\nAvailable templates: ${available.join(', ')}` : '';

    console.error(
      'Error: Could not fetch example template data.\n' +
        `URL: ${getExamplesBaseUrl()}/${encodeURIComponent(name)}/template.json\n` +
        `${error instanceof Error ? error.message : String(error)}` +
        fallbackHint,
    );
    process.exit(3);
  }
}

function generateSampleInputs(template: Record<string, unknown>): Record<string, string>[] {
  const schemas = template.schemas as Record<string, unknown>[][] | undefined;
  if (!Array.isArray(schemas) || schemas.length === 0) return [{}];

  const firstPage = schemas[0];
  if (!Array.isArray(firstPage)) return [{}];

  const input: Record<string, string> = {};
  for (const schema of firstPage) {
    if (typeof schema !== 'object' || schema === null) continue;
    const name = schema.name as string;
    const content = schema.content as string | undefined;
    const readOnly = schema.readOnly as boolean | undefined;

    if (readOnly) continue;
    if (name) {
      input[name] = content || `Sample ${name}`;
    }
  }

  return [input];
}

export default defineCommand({
  meta: {
    name: 'examples',
    description: 'List and output example pdfme templates',
  },
  args: {
    name: { type: 'positional', description: 'Template name to output', required: false },
    list: { type: 'boolean', description: 'List available templates', default: false },
    output: { type: 'string', alias: 'o', description: 'Output file path' },
    withInputs: { type: 'boolean', alias: 'w', description: 'Output unified format with sample inputs', default: false },
  },
  async run({ args }) {
    let templateNames: string[];
    try {
      templateNames = await getExampleTemplateNames();
    } catch (error) {
      console.error(
        'Error: Could not fetch examples index.\n' +
          `URL: ${getExamplesBaseUrl()}/index.json\n` +
          `${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(3);
    }

    if (args.list || !args.name) {
      console.log('Available templates:');
      for (const name of templateNames) {
        console.log(`  ${name}`);
      }
      return;
    }

    if (!templateNames.includes(args.name)) {
      console.error(
        `Error: Template "${args.name}" not found.\nAvailable templates: ${templateNames.join(', ')}`,
      );
      process.exit(1);
    }

    const template = await loadTemplate(args.name);

    let output: unknown;
    if (args.withInputs) {
      const inputs = generateSampleInputs(template);
      output = { template, inputs };
    } else {
      output = template;
    }

    const jsonStr = JSON.stringify(output, null, 2);

    if (args.output) {
      writeOutput(args.output, new TextEncoder().encode(jsonStr));
      const label = args.withInputs ? 'Job file' : 'Template';
      console.log(`\u2713 ${label} written to ${args.output}`);
    } else {
      console.log(jsonStr);
    }
  },
});
