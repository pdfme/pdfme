import { CLI_VERSION } from './version.js';

export interface ExampleManifestEntry {
  name: string;
  author: string;
  path: string;
  thumbnailPath: string;
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

export interface ExampleManifest {
  schemaVersion: number;
  cliVersion: string;
  templates: ExampleManifestEntry[];
}

export interface ExampleManifestLoadResult {
  manifest: ExampleManifest;
  source: 'remote';
  url?: string;
}

export interface ExampleTemplateLoadResult {
  template: Record<string, unknown>;
  source: 'remote';
  url?: string;
}

export function getExamplesBaseUrl(): string {
  return process.env.PDFME_EXAMPLES_BASE_URL ?? 'https://playground.pdfme.com/template-assets';
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getExampleManifest(): Promise<ExampleManifestLoadResult> {
  let lastError: unknown;
  for (const url of getManifestUrls()) {
    try {
      return { manifest: normalizeManifest(await fetchJson<unknown>(url)), source: 'remote', url };
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Could not load examples manifest. ${formatError(lastError)}`);
}

export async function getExampleTemplateNames(): Promise<string[]> {
  const { manifest } = await getExampleManifest();
  return manifest.templates
    .map((entry) => entry.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0)
    .sort();
}

export async function fetchExampleTemplate(
  name: string,
  options: { manifest?: ExampleManifest } = {},
): Promise<Record<string, unknown>> {
  const result = await fetchExampleTemplateWithSource(name, options);
  return result.template;
}

export async function fetchExampleTemplateWithSource(
  name: string,
  options: { manifest?: ExampleManifest } = {},
): Promise<ExampleTemplateLoadResult> {
  const manifest = options.manifest ?? (await getExampleManifest()).manifest;
  const entry = manifest.templates.find((template) => template.name === name);

  if (!entry) {
    throw new Error(`Template "${name}" is not present in the examples manifest.`);
  }

  const relativePath = entry.path;
  const templateUrl = `${getExamplesBaseUrl().replace(/\/$/, '')}/${relativePath}`;
  return {
    template: await fetchJson<Record<string, unknown>>(templateUrl),
    source: 'remote',
    url: templateUrl,
  };
}

function getManifestUrls(): string[] {
  const baseUrl = getExamplesBaseUrl().replace(/\/$/, '');
  return [`${baseUrl}/manifest.json`, `${baseUrl}/index.json`];
}

function normalizeManifest(raw: unknown): ExampleManifest {
  if (Array.isArray(raw)) {
    return {
      schemaVersion: 1,
      cliVersion: CLI_VERSION,
      templates: normalizeEntries(raw),
    };
  }

  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Examples manifest must be a JSON object or array.');
  }

  const record = raw as Record<string, unknown>;
  const rawTemplates = Array.isArray(record.templates)
    ? record.templates
    : Array.isArray(record.entries)
      ? record.entries
      : undefined;

  if (!rawTemplates) {
    throw new Error('Examples manifest is missing templates.');
  }

  return {
    schemaVersion:
      typeof record.schemaVersion === 'number' && Number.isFinite(record.schemaVersion)
        ? record.schemaVersion
        : 1,
    cliVersion: typeof record.cliVersion === 'string' ? record.cliVersion : CLI_VERSION,
    templates: normalizeEntries(rawTemplates),
  };
}

function normalizeEntries(rawTemplates: unknown[]): ExampleManifestEntry[] {
  return rawTemplates
    .filter(
      (entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null,
    )
    .map((entry) => {
      const name = typeof entry.name === 'string' ? entry.name : '';

      return {
        name,
        author:
          typeof entry.author === 'string' && entry.author.length > 0 ? entry.author : 'pdfme',
        path:
          typeof entry.path === 'string' && entry.path.length > 0
            ? entry.path
            : `${name}/template.json`,
        thumbnailPath:
          typeof entry.thumbnailPath === 'string' && entry.thumbnailPath.length > 0
            ? entry.thumbnailPath
            : `${name}/thumbnail.png`,
        ...(typeof entry.description === 'string' ? { description: entry.description } : {}),
        ...(typeof entry.order === 'number' && Number.isFinite(entry.order)
          ? { order: entry.order }
          : {}),
        pageCount:
          typeof entry.pageCount === 'number' && Number.isFinite(entry.pageCount)
            ? entry.pageCount
            : 0,
        fieldCount:
          typeof entry.fieldCount === 'number' && Number.isFinite(entry.fieldCount)
            ? entry.fieldCount
            : 0,
        schemaTypes: normalizeStringArray(entry.schemaTypes),
        fontNames: normalizeStringArray(entry.fontNames),
        hasCJK: typeof entry.hasCJK === 'boolean' ? entry.hasCJK : false,
        basePdfKind:
          typeof entry.basePdfKind === 'string' && entry.basePdfKind.length > 0
            ? entry.basePdfKind
            : 'unknown',
        ...(typeof entry.sourceKind === 'string' ? { sourceKind: entry.sourceKind } : {}),
        ...(Array.isArray(entry.tags) ? { tags: normalizeStringArray(entry.tags) } : {}),
        ...(typeof entry.title === 'string' ? { title: entry.title } : {}),
      };
    })
    .filter((entry) => entry.name.length > 0);
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
