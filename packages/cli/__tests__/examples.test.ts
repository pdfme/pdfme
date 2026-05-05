import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import examplesCmd from '../src/commands/examples.js';
import {
  fetchExampleTemplate,
  getExampleManifest,
  getExampleTemplateNames,
} from '../src/example-templates.js';
import { OFFICIAL_EXAMPLE_FONT_URLS } from '../src/example-fonts.js';
import { a4BasePdf } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '..', '.test-tmp-examples');

describe('examples command', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.PDFME_EXAMPLES_BASE_URL;
    rmSync(TMP, { recursive: true, force: true });
  });

  it('fetches manifest.json for --list output', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      expect(String(input)).toBe('https://playground.pdfme.com/template-assets/manifest.json');
      return new Response(
        JSON.stringify({
          schemaVersion: 1,
          cliVersion: '0.1.0-alpha.0',
          templates: [{ name: 'zeta' }, { name: 'alpha' }],
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      );
    });

    vi.stubGlobal('fetch', fetchMock);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await examplesCmd.run!({
      args: { list: true, name: undefined, json: false },
      rawArgs: [],
      cmd: examplesCmd,
    } as never);

    expect(logSpy.mock.calls.map(([message]) => message)).toEqual([
      'Available templates:',
      '  alpha',
      '  zeta',
    ]);
  });

  it('falls back to index.json when manifest.json is unavailable', async () => {
    process.env.PDFME_EXAMPLES_BASE_URL = 'https://fixtures.example.com/template-assets';

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);

        if (url.endsWith('/manifest.json')) {
          return new Response('missing', { status: 404 });
        }

        if (url.endsWith('/index.json')) {
          return new Response(JSON.stringify([{ name: 'invoice', author: 'pdfme' }]), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }

        throw new Error(`Unexpected URL: ${url}`);
      }),
    );

    const manifest = await getExampleManifest();
    expect(manifest.source).toBe('remote');
    expect(manifest.url).toBe('https://fixtures.example.com/template-assets/index.json');
    expect(manifest.manifest.templates).toEqual([
      {
        name: 'invoice',
        author: 'pdfme',
        path: 'invoice/template.json',
        thumbnailPath: 'invoice/thumbnail.png',
        pageCount: 0,
        fieldCount: 0,
        schemaTypes: [],
        fontNames: [],
        hasCJK: false,
        basePdfKind: 'unknown',
      },
    ]);

    const names = await getExampleTemplateNames();
    expect(names).toEqual(['invoice']);
  });

  it('normalizes manifest entries to a complete metadata shape', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              schemaVersion: 1,
              cliVersion: '0.1.0-alpha.0',
              templates: [{ name: 'invoice' }],
            }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          ),
      ),
    );

    const manifest = await getExampleManifest();
    expect(manifest.manifest.templates).toEqual([
      {
        name: 'invoice',
        author: 'pdfme',
        path: 'invoice/template.json',
        thumbnailPath: 'invoice/thumbnail.png',
        pageCount: 0,
        fieldCount: 0,
        schemaTypes: [],
        fontNames: [],
        hasCJK: false,
        basePdfKind: 'unknown',
      },
    ]);
  });

  it('fetches a template referenced from the manifest', async () => {
    process.env.PDFME_EXAMPLES_BASE_URL = 'https://fixtures.example.com/template-assets';

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);

        if (url.endsWith('/manifest.json')) {
          return new Response(
            JSON.stringify({
              schemaVersion: 1,
              cliVersion: '0.1.0-alpha.0',
              templates: [{ name: 'invoice', path: 'invoice/template.json' }],
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }

        if (url.endsWith('/invoice/template.json')) {
          return new Response(
            JSON.stringify({
              basePdf: a4BasePdf(),
              schemas: [[{ name: 'title', type: 'text' }]],
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }

        throw new Error(`Unexpected URL: ${url}`);
      }),
    );

    const template = await fetchExampleTemplate('invoice');
    expect(template).toEqual({
      basePdf: a4BasePdf(),
      schemas: [[{ name: 'title', type: 'text' }]],
    });
  });

  it('writes output files and emits structured JSON', async () => {
    process.env.PDFME_EXAMPLES_BASE_URL = 'https://fixtures.example.com/template-assets';
    mkdirSync(TMP, { recursive: true });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);

        if (url.endsWith('/manifest.json')) {
          return new Response(
            JSON.stringify({
              schemaVersion: 1,
              cliVersion: '0.1.0-alpha.0',
              templates: [{ name: 'invoice', path: 'invoice/template.json' }],
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }

        if (url.endsWith('/invoice/template.json')) {
          return new Response(
            JSON.stringify({
              basePdf: a4BasePdf(),
              schemas: [[{ name: 'title', type: 'text' }]],
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }

        throw new Error(`Unexpected URL: ${url}`);
      }),
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const outputPath = join(TMP, 'job.json');

    await examplesCmd.run!({
      args: {
        list: false,
        name: 'invoice',
        output: outputPath,
        withInputs: true,
        json: true,
      },
      rawArgs: [],
      cmd: examplesCmd,
    } as never);

    const payload = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0] ?? 'null'));
    expect(payload.ok).toBe(true);
    expect(payload.source).toBe('remote');
    expect(payload.outputPath).toBe(outputPath);

    const written = JSON.parse(readFileSync(outputPath, 'utf8'));
    expect(written.inputs).toEqual([{ title: 'Sample title' }]);
  });

  it('includes editable fields from every template page in generated sample inputs', async () => {
    process.env.PDFME_EXAMPLES_BASE_URL = 'https://fixtures.example.com/template-assets';
    mkdirSync(TMP, { recursive: true });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);

        if (url.endsWith('/manifest.json')) {
          return new Response(
            JSON.stringify({
              schemaVersion: 1,
              cliVersion: '0.1.0-alpha.0',
              templates: [{ name: 'multi-page', path: 'multi-page/template.json' }],
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }

        if (url.endsWith('/multi-page/template.json')) {
          return new Response(
            JSON.stringify({
              basePdf: a4BasePdf(),
              schemas: [
                [
                  { name: 'page1', type: 'text', content: 'Page 1' },
                  { name: 'readonly', type: 'text', content: 'Locked', readOnly: true },
                ],
                {
                  page2: { type: 'text', content: 'Page 2' },
                  page2Readonly: { type: 'text', content: 'Locked 2', readOnly: true },
                },
                [{ name: 'page3', type: 'text' }],
              ],
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }

        throw new Error(`Unexpected URL: ${url}`);
      }),
    );

    const outputPath = join(TMP, 'multi-page-job.json');

    await examplesCmd.run!({
      args: {
        list: false,
        name: 'multi-page',
        output: outputPath,
        withInputs: true,
        json: true,
      },
      rawArgs: [],
      cmd: examplesCmd,
    } as never);

    const written = JSON.parse(readFileSync(outputPath, 'utf8'));
    expect(written.inputs).toEqual([{ page1: 'Page 1', page2: 'Page 2', page3: 'Sample page3' }]);
  });

  it('embeds official example font URLs into unified jobs', async () => {
    process.env.PDFME_EXAMPLES_BASE_URL = 'https://fixtures.example.com/template-assets';
    mkdirSync(TMP, { recursive: true });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);

        if (url.endsWith('/manifest.json')) {
          return new Response(
            JSON.stringify({
              schemaVersion: 1,
              cliVersion: '0.1.0-alpha.0',
              templates: [{ name: 'certificate-black', path: 'certificate-black/template.json' }],
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }

        if (url.endsWith('/certificate-black/template.json')) {
          return new Response(
            JSON.stringify({
              basePdf: a4BasePdf(),
              schemas: [
                [
                  {
                    name: 'signature',
                    type: 'text',
                    fontName: 'PinyonScript-Regular',
                    position: { x: 20, y: 20 },
                    width: 100,
                    height: 20,
                  },
                ],
              ],
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }

        throw new Error(`Unexpected URL: ${url}`);
      }),
    );

    const outputPath = join(TMP, 'certificate-job.json');

    await examplesCmd.run!({
      args: {
        list: false,
        name: 'certificate-black',
        output: outputPath,
        withInputs: true,
        json: true,
      },
      rawArgs: [],
      cmd: examplesCmd,
    } as never);

    const written = JSON.parse(readFileSync(outputPath, 'utf8'));
    expect(written.options.font).toEqual({
      'PinyonScript-Regular': {
        data: OFFICIAL_EXAMPLE_FONT_URLS['PinyonScript-Regular'],
        fallback: false,
        subset: true,
      },
    });
  });
});
