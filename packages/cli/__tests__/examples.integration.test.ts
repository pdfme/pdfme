import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Dirent } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, '..', 'dist', 'index.js');
const PRELOAD = pathToFileURL(join(__dirname, 'fixtures', 'fetch-fixture-loader.mjs')).href;
const TMP = join(__dirname, '..', '.test-tmp-examples-integration');
const ASSETS_DIR = resolve(__dirname, '..', '..', '..', 'playground', 'public', 'template-assets');
const MANIFEST_PATH = join(ASSETS_DIR, 'manifest.json');
const METADATA_PATH = join(ASSETS_DIR, 'metadata.json');
const VERSIONED_MANIFEST_DIR = join(ASSETS_DIR, 'manifests');
const FONT_FIXTURES_DIR = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'packages',
  'generator',
  '__tests__',
  'assets',
  'fonts',
);

interface ExampleManifestEntry {
  name: string;
  author: string;
  path: string;
  thumbnailPath: string;
  sourcePath?: string;
  description?: string;
  order?: number;
  pageCount: number;
  fieldCount: number;
  schemaTypes: string[];
  fontNames: string[];
  hasCJK: boolean;
  basePdfKind: string;
  sourceKind?: string;
  tags?: string[];
  title?: string;
}

interface ExampleManifest {
  schemaVersion: number;
  cliVersion: string;
  templates: ExampleManifestEntry[];
}

function createFixtureEnv(rootDir: string): NodeJS.ProcessEnv {
  const homeDir = join(rootDir, 'home');
  return {
    ...process.env,
    HOME: homeDir,
    PDFME_EXAMPLES_BASE_URL: 'https://fixtures.example.com/template-assets',
    PDFME_TEST_ASSETS_DIR: ASSETS_DIR,
    PDFME_TEST_FONT_FIXTURES_DIR: FONT_FIXTURES_DIR,
  };
}

function runCli(
  args: string[],
  options: { env?: NodeJS.ProcessEnv } = {},
): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync('node', ['--import', PRELOAD, CLI, ...args], {
      encoding: 'utf8',
      timeout: 60000,
      env: options.env,
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
      exitCode: error.status ?? 1,
    };
  }
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

function listPlaygroundTemplateNames(): string[] {
  return readdirSync(ASSETS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(ASSETS_DIR, entry.name, 'template.json')))
    .map((entry) => entry.name)
    .sort();
}

function normalizeSchemas(rawSchemas: unknown): Array<Array<Record<string, unknown>>> {
  if (!Array.isArray(rawSchemas)) {
    return [];
  }

  return rawSchemas.map((page) => {
    if (Array.isArray(page)) {
      return page.filter((schema): schema is Record<string, unknown> => typeof schema === 'object' && schema !== null);
    }

    if (typeof page === 'object' && page !== null) {
      return Object.values(page).filter(
        (schema): schema is Record<string, unknown> => typeof schema === 'object' && schema !== null,
      );
    }

    return [];
  });
}

function hasCjkContent(schemas: Array<Record<string, unknown>>): boolean {
  return schemas.some((schema) =>
    ['content', 'title', 'placeholder'].some(
      (key) => typeof schema[key] === 'string' && /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/.test(schema[key]),
    ),
  );
}

function detectBasePdfKind(basePdf: unknown): string {
  if (typeof basePdf === 'string') {
    if (basePdf.startsWith('data:')) return 'dataUri';
    if (basePdf.endsWith('.pdf')) return 'pdfPath';
    return 'string';
  }

  if (basePdf && typeof basePdf === 'object') {
    if ('width' in basePdf && 'height' in basePdf) return 'blank';
    return 'object';
  }

  return 'unknown';
}

function inferSourceKind(name: string): string {
  if (name.startsWith('jsx-')) return 'jsx';
  if (name.startsWith('md2pdf-')) return 'md2pdf';
  return 'designer';
}

function readTemplateMetadata(name: string): Record<string, unknown> {
  const metadata = readJson<Record<string, Record<string, unknown>>>(METADATA_PATH);
  const itemMetadataPath = join(ASSETS_DIR, name, 'metadata.json');
  if (!existsSync(itemMetadataPath)) return metadata[name] ?? {};

  return readJson<Record<string, unknown>>(itemMetadataPath);
}

function getSourcePath(name: string, sourceKind: string): string | undefined {
  if (sourceKind === 'jsx' && existsSync(join(ASSETS_DIR, name, 'source.tsx'))) {
    return `${name}/source.tsx`;
  }
  if (sourceKind === 'md2pdf' && existsSync(join(ASSETS_DIR, name, 'source.md'))) {
    return `${name}/source.md`;
  }
  return undefined;
}

function buildExpectedManifestEntry(name: string): ExampleManifestEntry {
  const template = readJson<Record<string, unknown>>(join(ASSETS_DIR, name, 'template.json'));
  const metadata = readTemplateMetadata(name);
  const schemas = normalizeSchemas(template.schemas);
  const flattenedSchemas = schemas.flat();
  const sourceKind =
    typeof metadata.sourceKind === 'string' ? metadata.sourceKind : inferSourceKind(name);
  const sourcePath = getSourcePath(name, sourceKind);

  const entry: ExampleManifestEntry = {
    name,
    author: typeof template.author === 'string' && template.author.length > 0 ? template.author : 'pdfme',
    path: `${name}/template.json`,
    thumbnailPath: `${name}/thumbnail.png`,
    ...(sourcePath ? { sourcePath } : {}),
    description: typeof metadata.description === 'string' ? metadata.description : undefined,
    ...(typeof metadata.order === 'number' && Number.isFinite(metadata.order)
      ? { order: metadata.order }
      : {}),
    pageCount: schemas.length,
    fieldCount: flattenedSchemas.length,
    schemaTypes: [
      ...new Set(
        flattenedSchemas
          .map((schema) => schema.type)
          .filter((type): type is string => typeof type === 'string' && type.length > 0),
      ),
    ].sort(),
    fontNames: [
      ...new Set(
        flattenedSchemas
          .map((schema) => schema.fontName)
          .filter((font): font is string => typeof font === 'string' && font.length > 0),
      ),
    ].sort(),
    hasCJK: hasCjkContent(flattenedSchemas),
    basePdfKind: detectBasePdfKind(template.basePdf),
    sourceKind,
    tags: Array.isArray(metadata.tags)
      ? metadata.tags.filter((tag): tag is string => typeof tag === 'string' && tag.length > 0)
      : [],
  };

  if (typeof metadata.title === 'string') {
    entry.title = metadata.title;
  }

  return entry;
}

describe('examples integration smoke', () => {
  afterEach(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it('uses a playground example to generate a PDF through the CLI', () => {
    mkdirSync(TMP, { recursive: true });
    const env = createFixtureEnv(TMP);
    const jobPath = join(TMP, 'invoice-job.json');
    const pdfPath = join(TMP, 'invoice.pdf');

    const examplesResult = runCli(['examples', 'invoice', '--withInputs', '-o', jobPath, '--json'], {
      env,
    });
    expect(examplesResult.exitCode).toBe(0);

    const examplesPayload = JSON.parse(examplesResult.stdout);
    expect(examplesPayload.ok).toBe(true);
    expect(examplesPayload.command).toBe('examples');
    expect(examplesPayload.outputPath).toBe(jobPath);
    expect(existsSync(jobPath)).toBe(true);

    const generateResult = runCli(['generate', jobPath, '-o', pdfPath, '--json'], { env });
    expect(generateResult.exitCode).toBe(0);

    const payload = JSON.parse(generateResult.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.command).toBe('generate');
    expect(payload.outputPath).toBe(pdfPath);
    expect(existsSync(pdfPath)).toBe(true);
  });

  it('keeps manifest and playground assets in sync', () => {
    const manifest = readJson<ExampleManifest>(MANIFEST_PATH);
    const versionedManifestPath = join(VERSIONED_MANIFEST_DIR, `${manifest.cliVersion}.json`);
    const versionedManifestFiles = readdirSync(VERSIONED_MANIFEST_DIR, { withFileTypes: true })
      .filter((entry: Dirent) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry: Dirent) => entry.name)
      .sort();

    expect(manifest.schemaVersion).toBe(1);
    expect(versionedManifestFiles).toEqual([`${manifest.cliVersion}.json`]);
    expect(existsSync(versionedManifestPath)).toBe(true);
    expect(readJson<ExampleManifest>(versionedManifestPath)).toEqual(manifest);

    const manifestNames = manifest.templates.map((entry) => entry.name).sort();
    expect(manifestNames).toEqual(listPlaygroundTemplateNames());

    const expectedEntries = manifest.templates.map(({ name }) => buildExpectedManifestEntry(name));
    expect(manifest.templates).toEqual(expectedEntries);

    for (const entry of manifest.templates) {
      expect(existsSync(join(ASSETS_DIR, entry.path))).toBe(true);
    }
  });

  it('lists manifest metadata through the CLI', () => {
    mkdirSync(TMP, { recursive: true });
    const result = runCli(['examples', '--list', '--json'], {
      env: createFixtureEnv(TMP),
    });

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.command).toBe('examples');
    expect(payload.mode).toBe('list');
    expect(payload.templateCount).toBe(readJson<ExampleManifest>(MANIFEST_PATH).templates.length);
    expect(payload.source).toBe('remote');
    expect(payload.baseUrl).toBe('https://fixtures.example.com/template-assets');
    expect(payload.manifest).toEqual(readJson<ExampleManifest>(MANIFEST_PATH));
  });

  it('supports verbose output without polluting JSON stdout', () => {
    mkdirSync(TMP, { recursive: true });
    const env = createFixtureEnv(TMP);
    const jobPath = join(TMP, 'invoice-verbose.job.json');

    const result = spawnSync(
      'node',
      ['--import', PRELOAD, CLI, 'examples', 'invoice', '--withInputs', '-o', jobPath, '-v', '--json'],
      {
        encoding: 'utf8',
        timeout: 60000,
        env,
      },
    );

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.command).toBe('examples');
    expect(payload.outputPath).toBe(jobPath);
    expect(result.stderr).toContain('Base URL: https://fixtures.example.com/template-assets');
    expect(result.stderr).toContain('Manifest source: remote');
    expect(result.stderr).toContain('Template: invoice');
    expect(result.stderr).toContain(`Output: ${jobPath}`);
  });

  it(
    'exports every playground example through examples -w and generates authoring starters',
    () => {
      mkdirSync(TMP, { recursive: true });
      const env = createFixtureEnv(TMP);
      const manifest = readJson<ExampleManifest>(MANIFEST_PATH);
      const generatedTemplateNames: string[] = [];

      for (const { name, sourceKind } of manifest.templates) {
        const jobPath = join(TMP, `${name}.job.json`);
        const pdfPath = join(TMP, `${name}.pdf`);

        const examplesResult = runCli(['examples', name, '--withInputs', '-o', jobPath, '--json'], {
          env,
        });
        if (examplesResult.exitCode !== 0) {
          throw new Error(
            `Example "${name}" failed to export.\nstdout:\n${examplesResult.stdout}\nstderr:\n${examplesResult.stderr}`,
          );
        }

        const examplePayload = JSON.parse(examplesResult.stdout);
        expect(examplePayload.ok).toBe(true);
        expect(examplePayload.command).toBe('examples');
        expect(examplePayload.outputPath).toBe(jobPath);

        const job = JSON.parse(readFileSync(jobPath, 'utf8'));
        expect(job).toHaveProperty('template');
        expect(Array.isArray(job.inputs)).toBe(true);
        expect(existsSync(jobPath)).toBe(true);

        // Full PDF rendering for every playground template is covered by the generator
        // integration snapshots. Keep this CLI test focused on exported job validity for
        // all examples, then run PDF generation for the generated authoring starters where
        // sample input shape regressions are most likely.
        if (sourceKind === 'designer') {
          continue;
        }

        const generateResult = runCli(['generate', jobPath, '-o', pdfPath, '--json'], { env });
        if (generateResult.exitCode !== 0) {
          throw new Error(
            `Example "${name}" failed to generate via CLI.\nJob:\n${JSON.stringify(job, null, 2)}\nstdout:\n${generateResult.stdout}\nstderr:\n${generateResult.stderr}`,
          );
        }

        const payload = JSON.parse(generateResult.stdout);
        expect(payload.ok).toBe(true);
        expect(payload.command).toBe('generate');
        expect(payload.outputPath).toBe(pdfPath);
        expect(existsSync(pdfPath)).toBe(true);
        generatedTemplateNames.push(name);
      }

      expect(generatedTemplateNames.sort()).toEqual(
        manifest.templates
          .filter((entry) => entry.sourceKind !== 'designer')
          .map((entry) => entry.name)
          .sort(),
      );
    },
    180000,
  );
});
