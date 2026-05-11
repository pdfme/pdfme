import { DEFAULT_FONT_NAME, getDefaultFont } from '@pdfme/common';
import { compileJsxFunctionBody, renderJsxSource } from '../src/routes/jsxPlaygroundRuntime';
import { readAuthoringStarterFixtures } from './authoringStarterFixtures';

const defaultFont = getDefaultFont();
const testFont = {
  ...defaultFont,
  NotoSansJP: {
    ...defaultFont[DEFAULT_FONT_NAME],
    fallback: false,
  },
};
const jsxPlaygroundPresets = readAuthoringStarterFixtures('jsx');

describe('JSX playground runtime', () => {
  it('compiles JSX function bodies with pdfme component calls', () => {
    const compiled = compileJsxFunctionBody(
      'return (<Page><Text height={10}>Hello</Text></Page>);',
    );

    expect(compiled).toContain('createElement(Page');
    expect(compiled).toContain('createElement(Text');
  });

  it('rejects imports, exports, and browser globals', () => {
    expect(() => compileJsxFunctionBody('import { Page } from "@pdfme/jsx";')).toThrow(
      'does not support import/export',
    );
    expect(() => compileJsxFunctionBody('export default <Page />;')).toThrow(
      'does not support import/export',
    );
    expect(() => compileJsxFunctionBody('return window.localStorage;')).toThrow(
      'does not allow window',
    );
    expect(() =>
      compileJsxFunctionBody('return importScripts("https://example.com/a.js");'),
    ).toThrow('does not allow importScripts');
    expect(() =>
      compileJsxFunctionBody('return (<Page><Text height={10}>{fetch("/")}</Text></Page>);'),
    ).toThrow('does not allow fetch');
  });

  it('allows restricted words in rendered text content', () => {
    expect(() =>
      compileJsxFunctionBody(
        'return (<Page><Text height={10}>window document importScripts</Text></Page>);',
      ),
    ).not.toThrow();
  });

  it('renders JSX into a normal pdfme template result', async () => {
    const result = await renderJsxSource(
      'return (<Page size="A4"><Text height={10}>Hello JSX</Text></Page>);',
      testFont,
    );

    expect(result.inputs).toEqual([{}]);
    expect(result.template.schemas).toHaveLength(1);
    expect(result.template.schemas[0]?.[0]).toMatchObject({
      content: 'Hello JSX',
      name: 'text_1',
      position: { x: 0, y: 0 },
      readOnly: true,
      type: 'text',
    });
  });

  it('rejects JSX that renders an invalid pdfme template', async () => {
    await expect(
      renderJsxSource(
        'return (<Page><Text name={123} height={10}>Bad name</Text></Page>);',
        testFont,
      ),
    ).rejects.toThrow('Invalid argument');
  });

  it.each(jsxPlaygroundPresets)('renders the $label preset', async ({ source }) => {
    const result = await renderJsxSource(source, testFont);

    expect(result.inputs).toHaveLength(1);
    expect(result.template.schemas.length).toBeGreaterThan(0);
    expect(result.template.schemas[0]?.length).toBeGreaterThan(0);
  });
});
