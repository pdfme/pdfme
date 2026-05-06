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

  it('does not underline form links when they are not clickable', async () => {
    const textBlock = await renderLinkedMultiVariableText('form');
    const docsSpan = Array.from(textBlock.querySelectorAll('span')).find(
      (span) => span.textContent === 'docs',
    );

    expect(textBlock.querySelector('a')).toBeNull();
    expect(docsSpan?.style.textDecoration).not.toContain('underline');
  });

  it('renders split form chunks as read-only resolved text', async () => {
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
    textBlock.dispatchEvent(new Event('blur'));

    expect(onChange).not.toHaveBeenCalled();
    expect(textBlock.textContent).toBe('first line');
  });
});
