import { getDefaultFont } from '@pdfme/common';
import { compileJsxFunctionBody, renderJsxSource } from '../src/routes/jsxPlaygroundRuntime';

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
  });

  it('renders JSX into a normal pdfme template result', async () => {
    const result = await renderJsxSource(
      'return (<Page size="A4"><Text height={10}>Hello JSX</Text></Page>);',
      getDefaultFont(),
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
});
