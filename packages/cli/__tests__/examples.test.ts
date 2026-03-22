import { afterEach, describe, expect, it, vi } from 'vitest';
import examplesCmd from '../src/commands/examples.js';
import { getExampleTemplateNames } from '../src/example-templates.js';

describe('examples command', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.PDFME_EXAMPLES_BASE_URL;
  });

  it('fetches the remote example list for --list output', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      expect(String(input)).toBe('https://playground.pdfme.com/template-assets/index.json');
      return new Response(JSON.stringify([{ name: 'zeta' }, { name: 'alpha' }]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    vi.stubGlobal('fetch', fetchMock);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await examplesCmd.run!({
      args: { list: true, name: undefined },
      rawArgs: [],
      cmd: examplesCmd,
    } as never);

    expect(logSpy.mock.calls.map(([message]) => message)).toEqual([
      'Available templates:',
      '  alpha',
      '  zeta',
    ]);
  });

  it('fails when the remote index cannot be fetched', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network down');
    }));

    await expect(getExampleTemplateNames()).rejects.toThrow('network down');
  });

  it('fetches remote template data and emits a unified job with sample inputs', async () => {
    process.env.PDFME_EXAMPLES_BASE_URL = 'https://fixtures.example.com/template-assets';

    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.endsWith('/index.json')) {
        return new Response(JSON.stringify([{ name: 'invoice' }]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (url.endsWith('/invoice/template.json')) {
        return new Response(
          JSON.stringify({
            basePdf: { width: 210, height: 297, padding: [20, 20, 20, 20] },
            schemas: [[
              {
                name: 'title',
                type: 'text',
                content: 'Invoice',
                readOnly: true,
              },
              {
                name: 'customerName',
                type: 'text',
                content: '',
                readOnly: false,
              },
            ]],
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        );
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await examplesCmd.run!({
      args: { list: false, name: 'invoice', output: undefined, withInputs: true },
      rawArgs: [],
      cmd: examplesCmd,
    } as never);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://fixtures.example.com/template-assets/index.json',
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://fixtures.example.com/template-assets/invoice/template.json',
      expect.any(Object),
    );

    const output = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0] ?? 'null'));
    expect(output.inputs).toEqual([{ customerName: 'Sample customerName' }]);
    expect(output.template.schemas).toHaveLength(1);
  });
});
