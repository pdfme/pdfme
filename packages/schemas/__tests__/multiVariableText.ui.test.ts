// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Font } from '@pdfme/common';
import { uiRender } from '../src/multiVariableText/uiRender.js';
import type { MultiVariableTextSchema } from '../src/multiVariableText/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sansData = readFileSync(path.join(__dirname, '/assets/fonts/SauceHanSansJP.ttf'));

const getSampleFont = (): Font => ({
  SauceHanSansJP: { fallback: true, data: sansData },
});

const getSchema = (): MultiVariableTextSchema =>
  ({
    id: 'inline-markdown-mvt',
    name: 'message',
    type: 'multiVariableText',
    content: '',
    position: { x: 0, y: 0 },
    width: 100,
    height: 30,
    text: '**{name}** uses `{code}`',
    variables: ['name', 'code'],
    alignment: 'left',
    verticalAlignment: 'top',
    fontName: 'SauceHanSansJP',
    fontSize: 13,
    lineHeight: 1,
    characterSpacing: 0,
    textFormat: 'inline-markdown',
    fontVariantFallback: 'synthetic',
    fontColor: '#000000',
    backgroundColor: '',
  }) as MultiVariableTextSchema;

const renderMultiVariableText = async (mode: 'viewer' | 'form') => {
  const rootElement = document.createElement('div');
  const schema = getSchema();

  await uiRender({
    value: JSON.stringify({ name: 'A **bold** user', code: 'PDF `42`' }),
    schema,
    rootElement,
    mode,
    options: { font: getSampleFont() },
    _cache: new Map(),
    theme: { colorPrimary: '#1677ff' },
  } as Parameters<typeof uiRender>[0]);

  return rootElement.querySelector(`#text-${schema.id}`) as HTMLDivElement;
};

const renderLinkedMultiVariableText = async (mode: 'viewer' | 'form') => {
  const rootElement = document.createElement('div');
  const schema: MultiVariableTextSchema = {
    ...getSchema(),
    text: '[docs](https://pdfme.com) for {name}',
    variables: ['name'],
  };

  await uiRender({
    value: JSON.stringify({ name: 'A **bold** user' }),
    schema,
    rootElement,
    mode,
    options: { font: getSampleFont() },
    _cache: new Map(),
    theme: { colorPrimary: '#1677ff' },
  } as Parameters<typeof uiRender>[0]);

  return rootElement.querySelector(`#text-${schema.id}`) as HTMLDivElement;
};

const renderSplitFormMultiVariableText = async (
  schemaOverrides: Partial<MultiVariableTextSchema>,
  value: string,
) => {
  const rootElement = document.createElement('div');
  const onChange = vi.fn();
  const schema: MultiVariableTextSchema = {
    ...getSchema(),
    text: '{name}',
    variables: ['name'],
    textFormat: 'plain',
    width: 100,
    ...schemaOverrides,
  };

  await uiRender({
    value,
    schema,
    rootElement,
    mode: 'form',
    onChange,
    options: { font: getSampleFont() },
    _cache: new Map(),
    theme: { colorPrimary: '#1677ff' },
  } as Parameters<typeof uiRender>[0]);

  const textBlock = rootElement.querySelector(`#text-${schema.id}`) as HTMLDivElement;
  const variableSpan = textBlock.querySelector('span') as HTMLSpanElement;
  return { onChange, textBlock, variableSpan };
};

describe('multiVariableText inline markdown UI rendering', () => {
  it('renders viewer variable values as literal text inside template markdown', async () => {
    const textBlock = await renderMultiVariableText('viewer');
    const spans = Array.from(textBlock.querySelectorAll('span'));

    expect(textBlock.textContent).toBe('A **bold** user uses PDF `42`');
    expect(spans[0].textContent).toBe('A **bold** user');
    expect(spans[0].style.fontWeight).toBe('800');
    expect(spans[0].style.textShadow).not.toBe('');
    expect(spans.at(-1)?.textContent).toBe('PDF `42`');
    expect(spans.at(-1)?.style.backgroundColor).not.toBe('');
  });

  it('renders form variable spans as literal text inside template markdown', async () => {
    const textBlock = await renderMultiVariableText('form');
    const spans = Array.from(textBlock.querySelectorAll('span'));

    expect(textBlock.textContent).toBe('A **bold** user uses PDF `42`');
    expect(spans[0].textContent).toBe('A **bold** user');
    expect(spans[0].style.fontWeight).toBe('800');
    expect(spans[0].style.textShadow).not.toBe('');
    expect(spans.at(-1)?.textContent).toBe('PDF `42`');
    expect(spans.at(-1)?.style.backgroundColor).not.toBe('');
  });

  it('renders viewer links through the parent text renderer', async () => {
    const textBlock = await renderLinkedMultiVariableText('viewer');
    const link = textBlock.querySelector('a') as HTMLAnchorElement;

    expect(textBlock.textContent).toBe('docs for A **bold** user');
    expect(link.textContent).toBe('docs');
    expect(link.href).toBe('https://pdfme.com/');
  });

  it('keeps static form links clickable while editing variables', async () => {
    const textBlock = await renderLinkedMultiVariableText('form');
    const link = textBlock.querySelector('a') as HTMLAnchorElement;
    const variableSpan = Array.from(textBlock.querySelectorAll('span')).find(
      (span) => span.contentEditable === 'plaintext-only',
    ) as HTMLSpanElement;

    expect(link.textContent).toBe('docs');
    expect(link.href).toBe('https://pdfme.com/');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
    expect(link.style.textDecoration).toContain('underline');
    expect(variableSpan.textContent).toBe('A **bold** user');
  });

  it('does not turn linked variable form inputs into anchors', async () => {
    const rootElement = document.createElement('div');
    const schema: MultiVariableTextSchema = {
      ...getSchema(),
      text: '[{name}](https://pdfme.com)',
      variables: ['name'],
    };

    await uiRender({
      value: JSON.stringify({ name: 'A **bold** user' }),
      schema,
      rootElement,
      mode: 'form',
      options: { font: getSampleFont() },
      _cache: new Map(),
      theme: { colorPrimary: '#1677ff' },
    } as Parameters<typeof uiRender>[0]);

    const textBlock = rootElement.querySelector(`#text-${schema.id}`) as HTMLDivElement;
    const variableSpan = textBlock.querySelector('span') as HTMLSpanElement;

    expect(textBlock.querySelector('a')).toBeNull();
    expect(variableSpan.contentEditable).toBe('plaintext-only');
    expect(variableSpan.textContent).toBe('A **bold** user');
    expect(variableSpan.style.textDecoration).toContain('underline');
  });

  it('writes split form chunk edits back into the full variable value', async () => {
    const rootElement = document.createElement('div');
    const onChange = vi.fn();
    const schema: MultiVariableTextSchema = {
      ...getSchema(),
      text: '{name}',
      variables: ['name'],
      textFormat: 'plain',
      width: 100,
      __splitRange: { unit: 'textLine', start: 0, end: 1 },
    };

    await uiRender({
      value: JSON.stringify({ name: 'first line\nsecond line' }),
      schema,
      rootElement,
      mode: 'form',
      onChange,
      options: { font: getSampleFont() },
      _cache: new Map(),
      theme: { colorPrimary: '#1677ff' },
    } as Parameters<typeof uiRender>[0]);

    const textBlock = rootElement.querySelector(`#text-${schema.id}`) as HTMLDivElement;
    const variableSpan = textBlock.querySelector('span') as HTMLSpanElement;
    expect(textBlock.textContent).toBe('first line');

    variableSpan.textContent = 'edited first line';
    variableSpan.dispatchEvent(new Event('blur'));

    expect(onChange).toHaveBeenCalledWith({
      key: 'content',
      value: JSON.stringify({ name: 'edited first line\nsecond line' }),
    });
  });

  it('writes later split form chunk edits back into the correct variable range', async () => {
    const rootElement = document.createElement('div');
    const onChange = vi.fn();
    const schema: MultiVariableTextSchema = {
      ...getSchema(),
      text: '{name}',
      variables: ['name'],
      textFormat: 'plain',
      width: 100,
      __splitRange: { unit: 'textLine', start: 1, end: 2 },
    };

    await uiRender({
      value: JSON.stringify({ name: 'first line\nsecond line' }),
      schema,
      rootElement,
      mode: 'form',
      onChange,
      options: { font: getSampleFont() },
      _cache: new Map(),
      theme: { colorPrimary: '#1677ff' },
    } as Parameters<typeof uiRender>[0]);

    const textBlock = rootElement.querySelector(`#text-${schema.id}`) as HTMLDivElement;
    const variableSpan = textBlock.querySelector('span') as HTMLSpanElement;
    expect(textBlock.textContent).toBe('second line');

    variableSpan.textContent = 'edited second line';
    variableSpan.dispatchEvent(new Event('blur'));

    expect(onChange).toHaveBeenCalledWith({
      key: 'content',
      value: JSON.stringify({ name: 'first line\nedited second line' }),
    });
  });

  it('keeps earlier split form edits when the next render receives the reflowed input', async () => {
    const first = await renderSplitFormMultiVariableText(
      {
        __splitRange: { unit: 'textLine', start: 0, end: 1 },
      },
      JSON.stringify({ name: 'first line\nsecond line' }),
    );

    first.variableSpan.textContent = 'edited first line';
    first.variableSpan.dispatchEvent(new Event('blur'));
    expect(first.onChange).toHaveBeenCalledTimes(1);
    const valueAfterFirstEdit = first.onChange.mock.calls[0][0].value as string;

    const second = await renderSplitFormMultiVariableText(
      {
        __splitRange: { unit: 'textLine', start: 1, end: 2 },
      },
      valueAfterFirstEdit,
    );

    expect(second.textBlock.textContent).toBe('second line');
    second.variableSpan.textContent = 'edited second line';
    second.variableSpan.dispatchEvent(new Event('blur'));

    expect(second.onChange).toHaveBeenCalledWith({
      key: 'content',
      value: JSON.stringify({ name: 'edited first line\nedited second line' }),
    });
  });

  it('updates repeated variable references without duplicating the replacement', async () => {
    const rootElement = document.createElement('div');
    const onChange = vi.fn();
    const schema: MultiVariableTextSchema = {
      ...getSchema(),
      text: '{name}\n{name}',
      variables: ['name'],
      textFormat: 'plain',
      width: 100,
      __splitRange: { unit: 'textLine', start: 1, end: 2 },
    };

    await uiRender({
      value: JSON.stringify({ name: 'Alice' }),
      schema,
      rootElement,
      mode: 'form',
      onChange,
      options: { font: getSampleFont() },
      _cache: new Map(),
      theme: { colorPrimary: '#1677ff' },
    } as Parameters<typeof uiRender>[0]);

    const textBlock = rootElement.querySelector(`#text-${schema.id}`) as HTMLDivElement;
    const variableSpan = textBlock.querySelector('span') as HTMLSpanElement;
    expect(textBlock.textContent).toBe('Alice');

    variableSpan.textContent = 'Bob';
    variableSpan.dispatchEvent(new Event('blur'));

    expect(onChange).toHaveBeenCalledWith({
      key: 'content',
      value: JSON.stringify({ name: 'Bob' }),
    });
  });

  it('preserves variable whitespace around split form chunk edits', async () => {
    const rootElement = document.createElement('div');
    const onChange = vi.fn();
    const schema: MultiVariableTextSchema = {
      ...getSchema(),
      text: '{name}',
      variables: ['name'],
      textFormat: 'plain',
      width: 100,
      __splitRange: { unit: 'textLine', start: 0, end: 1 },
    };

    await uiRender({
      value: JSON.stringify({ name: '  first line  \n  second line  ' }),
      schema,
      rootElement,
      mode: 'form',
      onChange,
      options: { font: getSampleFont() },
      _cache: new Map(),
      theme: { colorPrimary: '#1677ff' },
    } as Parameters<typeof uiRender>[0]);

    const textBlock = rootElement.querySelector(`#text-${schema.id}`) as HTMLDivElement;
    const variableSpan = textBlock.querySelector('span') as HTMLSpanElement;
    expect(textBlock.textContent).toBe('  first line');

    variableSpan.textContent = '  edited line  ';
    variableSpan.dispatchEvent(new Event('blur'));

    expect(onChange).toHaveBeenCalledWith({
      key: 'content',
      value: JSON.stringify({ name: '  edited line  \n  second line  ' }),
    });
  });

  it('does not create an editable split span for an empty variable value', async () => {
    const rootElement = document.createElement('div');
    const onChange = vi.fn();
    const schema: MultiVariableTextSchema = {
      ...getSchema(),
      text: '{name}',
      variables: ['name'],
      textFormat: 'plain',
      width: 100,
      __splitRange: { unit: 'textLine', start: 0, end: 1 },
    };

    await uiRender({
      value: JSON.stringify({ name: '' }),
      schema,
      rootElement,
      mode: 'form',
      onChange,
      options: { font: getSampleFont() },
      _cache: new Map(),
      theme: { colorPrimary: '#1677ff' },
    } as Parameters<typeof uiRender>[0]);

    const textBlock = rootElement.querySelector(`#text-${schema.id}`) as HTMLDivElement;
    textBlock.dispatchEvent(new Event('blur'));

    expect(textBlock.textContent).toBe('');
    expect(textBlock.querySelector('span')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('merges soft-wrapped split form chunk edits without replacing the whole variable', async () => {
    const rootElement = document.createElement('div');
    const onChange = vi.fn();
    const schema: MultiVariableTextSchema = {
      ...getSchema(),
      text: '{name}',
      variables: ['name'],
      textFormat: 'plain',
      width: 20,
      __splitRange: { unit: 'textLine', start: 1, end: 2 },
    };

    await uiRender({
      value: JSON.stringify({ name: 'alpha beta gamma delta epsilon' }),
      schema,
      rootElement,
      mode: 'form',
      onChange,
      options: { font: getSampleFont() },
      _cache: new Map(),
      theme: { colorPrimary: '#1677ff' },
    } as Parameters<typeof uiRender>[0]);

    const textBlock = rootElement.querySelector(`#text-${schema.id}`) as HTMLDivElement;
    const variableSpan = textBlock.querySelector('span') as HTMLSpanElement;
    expect(textBlock.textContent).not.toBe('');
    expect(textBlock.textContent).not.toBe('alpha beta gamma delta epsilon');

    variableSpan.textContent = 'edited chunk';
    variableSpan.dispatchEvent(new Event('blur'));

    const newValue = JSON.parse(onChange.mock.calls[0][0].value) as { name: string };
    expect(newValue.name).toContain('edited chunk');
    expect(newValue.name).not.toBe('edited chunk');
  });

  it('writes split inline markdown form chunk edits back into the full variable value', async () => {
    const rootElement = document.createElement('div');
    const onChange = vi.fn();
    const schema: MultiVariableTextSchema = {
      ...getSchema(),
      text: '**{name}**',
      variables: ['name'],
      width: 100,
      __splitRange: { unit: 'textLine', start: 0, end: 1 },
    };

    await uiRender({
      value: JSON.stringify({ name: 'first **line**\nsecond line' }),
      schema,
      rootElement,
      mode: 'form',
      onChange,
      options: { font: getSampleFont() },
      _cache: new Map(),
      theme: { colorPrimary: '#1677ff' },
    } as Parameters<typeof uiRender>[0]);

    const textBlock = rootElement.querySelector(`#text-${schema.id}`) as HTMLDivElement;
    const variableSpan = textBlock.querySelector('span') as HTMLSpanElement;
    expect(textBlock.textContent).toBe('first **line**');
    expect(variableSpan.contentEditable).toBe('plaintext-only');
    expect(variableSpan.style.fontWeight).toBe('800');
    expect(variableSpan.style.textShadow).not.toBe('');

    variableSpan.textContent = 'edited **first** line';
    variableSpan.dispatchEvent(new Event('blur'));

    expect(onChange).toHaveBeenCalledWith({
      key: 'content',
      value: JSON.stringify({ name: 'edited **first** line\nsecond line' }),
    });
  });

  it('writes later split inline markdown chunk edits back into the correct variable range', async () => {
    const rootElement = document.createElement('div');
    const onChange = vi.fn();
    const schema: MultiVariableTextSchema = {
      ...getSchema(),
      text: '**{name}**',
      variables: ['name'],
      width: 100,
      __splitRange: { unit: 'textLine', start: 1, end: 2 },
    };

    await uiRender({
      value: JSON.stringify({ name: 'first line\nsecond line' }),
      schema,
      rootElement,
      mode: 'form',
      onChange,
      options: { font: getSampleFont() },
      _cache: new Map(),
      theme: { colorPrimary: '#1677ff' },
    } as Parameters<typeof uiRender>[0]);

    const textBlock = rootElement.querySelector(`#text-${schema.id}`) as HTMLDivElement;
    const variableSpan = textBlock.querySelector('span') as HTMLSpanElement;
    expect(textBlock.textContent).toBe('second line');

    variableSpan.textContent = 'edited second line';
    variableSpan.dispatchEvent(new Event('blur'));

    expect(onChange).toHaveBeenCalledWith({
      key: 'content',
      value: JSON.stringify({ name: 'first line\nedited second line' }),
    });
  });

  it('keeps earlier split inline markdown edits when the next render receives the reflowed input', async () => {
    const first = await renderSplitFormMultiVariableText(
      {
        text: '**{name}**',
        textFormat: 'inline-markdown',
        __splitRange: { unit: 'textLine', start: 0, end: 1 },
      },
      JSON.stringify({ name: 'first **line**\nsecond line' }),
    );

    first.variableSpan.textContent = 'edited **first** line';
    first.variableSpan.dispatchEvent(new Event('blur'));
    expect(first.onChange).toHaveBeenCalledTimes(1);
    const valueAfterFirstEdit = first.onChange.mock.calls[0][0].value as string;

    const second = await renderSplitFormMultiVariableText(
      {
        text: '**{name}**',
        textFormat: 'inline-markdown',
        __splitRange: { unit: 'textLine', start: 1, end: 2 },
      },
      valueAfterFirstEdit,
    );

    expect(second.textBlock.textContent).toBe('second line');
    second.variableSpan.textContent = 'edited second line';
    second.variableSpan.dispatchEvent(new Event('blur'));

    expect(second.onChange).toHaveBeenCalledWith({
      key: 'content',
      value: JSON.stringify({ name: 'edited **first** line\nedited second line' }),
    });
  });

  it('does not create an editable split inline markdown span for an empty variable value', async () => {
    const rootElement = document.createElement('div');
    const onChange = vi.fn();
    const schema: MultiVariableTextSchema = {
      ...getSchema(),
      text: '**{name}**',
      variables: ['name'],
      width: 100,
      __splitRange: { unit: 'textLine', start: 0, end: 1 },
    };

    await uiRender({
      value: JSON.stringify({ name: '' }),
      schema,
      rootElement,
      mode: 'form',
      onChange,
      options: { font: getSampleFont() },
      _cache: new Map(),
      theme: { colorPrimary: '#1677ff' },
    } as Parameters<typeof uiRender>[0]);

    const textBlock = rootElement.querySelector(`#text-${schema.id}`) as HTMLDivElement;
    textBlock.dispatchEvent(new Event('blur'));

    expect(textBlock.textContent).toBe('');
    expect(textBlock.querySelector('span')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps split inline markdown static links clickable while editing variables', async () => {
    const rootElement = document.createElement('div');
    const onChange = vi.fn();
    const schema: MultiVariableTextSchema = {
      ...getSchema(),
      text: '[docs](https://pdfme.com) for **{name}**',
      variables: ['name'],
      width: 100,
      __splitRange: { unit: 'textLine', start: 0, end: 1 },
    };

    await uiRender({
      value: JSON.stringify({ name: 'Alice\nBob' }),
      schema,
      rootElement,
      mode: 'form',
      onChange,
      options: { font: getSampleFont() },
      _cache: new Map(),
      theme: { colorPrimary: '#1677ff' },
    } as Parameters<typeof uiRender>[0]);

    const textBlock = rootElement.querySelector(`#text-${schema.id}`) as HTMLDivElement;
    const variableSpan = Array.from(textBlock.querySelectorAll('span')).find(
      (span) => span.contentEditable === 'plaintext-only',
    ) as HTMLSpanElement;

    const link = textBlock.querySelector('a') as HTMLAnchorElement;
    expect(link.textContent).toBe('docs');
    expect(link.href).toBe('https://pdfme.com/');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
    expect(textBlock.textContent).toBe('docs for Alice');
    expect(link.style.textDecoration).toContain('underline');
    expect(variableSpan.textContent).toBe('Alice');
    expect(variableSpan.style.fontWeight).toBe('800');

    variableSpan.textContent = 'Carol';
    variableSpan.dispatchEvent(new Event('blur'));

    expect(onChange).toHaveBeenCalledWith({
      key: 'content',
      value: JSON.stringify({ name: 'Carol\nBob' }),
    });
  });
});
