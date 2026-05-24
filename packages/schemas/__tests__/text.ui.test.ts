// @vitest-environment jsdom

import type { Font as FontKitFont } from 'fontkit';
import type { Font } from '@pdfme/common';
import { uiRender } from '../src/text/uiRender.js';
import type { TextSchema } from '../src/text/types.js';

const createMockFont = (hasGlyphForCodePoint: (codePoint: number) => boolean) =>
  ({
    unitsPerEm: 1000,
    ascent: 800,
    descent: -200,
    bbox: { maxY: 800, minY: -200 },
    layout: (text: string) => ({
      glyphs: Array.from(text, () => ({ advanceWidth: 500 })),
    }),
    hasGlyphForCodePoint,
  }) as unknown as FontKitFont;

const getTextSchema = (): TextSchema => ({
  id: 'inline-markdown-text',
  name: 'message',
  type: 'text',
  content: '',
  position: { x: 0, y: 0 },
  width: 100,
  height: 30,
  alignment: 'left',
  verticalAlignment: 'top',
  fontName: 'Base',
  fontSize: 13,
  lineHeight: 1,
  characterSpacing: 0,
  textFormat: 'inline-markdown',
  readOnly: true,
  fontVariants: { code: 'Code' },
  fontVariantFallback: 'synthetic',
  fontColor: '#000000',
  backgroundColor: '',
});

describe('text inline markdown UI rendering', () => {
  it('checks unsupported characters against each resolved variant font', async () => {
    const starCodePoint = '★'.codePointAt(0) ?? 0;
    const rootElement = document.createElement('div');
    const schema = getTextSchema();
    const font = {
      Base: { data: new Uint8Array(), fallback: true },
      Code: { data: new Uint8Array() },
    } as Font;
    const cache = new Map<string | number, unknown>([
      ['getFontKitFont-Base', createMockFont((codePoint) => codePoint !== starCodePoint)],
      ['getFontKitFont-Code', createMockFont(() => true)],
    ]);

    await uiRender({
      value: '★ `★`',
      schema,
      rootElement,
      mode: 'viewer',
      options: { font },
      _cache: cache,
      theme: { colorPrimary: '#1677ff' },
    } as Parameters<typeof uiRender>[0]);

    const textBlock = rootElement.querySelector(`#text-${schema.id}`) as HTMLDivElement;
    const spans = Array.from(textBlock.querySelectorAll('span'));

    expect(textBlock.textContent).toBe('〿 ★');
    expect(spans.at(-1)?.textContent).toBe('★');
    expect(spans.at(-1)?.style.fontFamily).toContain('Code');
  });

  it('renders inline markdown links as anchors in read-only mode', async () => {
    const rootElement = document.createElement('div');
    const schema = getTextSchema();
    const font = {
      Base: { data: new Uint8Array(), fallback: true },
    } as Font;
    const cache = new Map<string | number, unknown>([
      ['getFontKitFont-Base', createMockFont(() => true)],
    ]);

    await uiRender({
      value: 'Visit [pdfme](https://pdfme.com).',
      schema,
      rootElement,
      mode: 'viewer',
      options: { font },
      _cache: cache,
      theme: { colorPrimary: '#1677ff' },
    } as Parameters<typeof uiRender>[0]);

    const link = rootElement.querySelector('a') as HTMLAnchorElement;

    expect(rootElement.textContent).toBe('Visit pdfme.');
    expect(link.textContent).toBe('pdfme');
    expect(link.href).toBe('https://pdfme.com/');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
    expect(link.style.textDecoration).toContain('underline');
  });

  it('renders internal inline markdown links as same-document anchors', async () => {
    const rootElement = document.createElement('div');
    const schema = getTextSchema();
    const font = {
      Base: { data: new Uint8Array(), fallback: true },
    } as Font;
    const cache = new Map<string | number, unknown>([
      ['getFontKitFont-Base', createMockFont(() => true)],
    ]);

    await uiRender({
      value: 'Jump to [intro](#intro).',
      schema,
      rootElement,
      mode: 'viewer',
      options: { font },
      _cache: cache,
      theme: { colorPrimary: '#1677ff' },
    } as Parameters<typeof uiRender>[0]);

    const link = rootElement.querySelector('a') as HTMLAnchorElement;

    expect(rootElement.textContent).toBe('Jump to intro.');
    expect(link.textContent).toBe('intro');
    expect(link.getAttribute('href')).toBe('#intro');
    expect(link.target).toBe('');
    expect(link.rel).toBe('');
    expect(link.style.textDecoration).toContain('underline');
  });

  it('does not create anchors for unsafe inline markdown links', async () => {
    const rootElement = document.createElement('div');
    const schema = getTextSchema();
    const font = {
      Base: { data: new Uint8Array(), fallback: true },
    } as Font;
    const cache = new Map<string | number, unknown>([
      ['getFontKitFont-Base', createMockFont(() => true)],
    ]);

    await uiRender({
      value: 'Visit [bad](javascript:alert(1)).',
      schema,
      rootElement,
      mode: 'viewer',
      options: { font },
      _cache: cache,
      theme: { colorPrimary: '#1677ff' },
    } as Parameters<typeof uiRender>[0]);

    expect(rootElement.querySelector('a')).toBeNull();
    expect(rootElement.textContent).toBe('Visit [bad](javascript:alert(1)).');
  });

  it('lets non-top vertical alignment move the UI text block', async () => {
    const rootElement = document.createElement('div');
    const schema: TextSchema = {
      ...getTextSchema(),
      textFormat: 'plain',
      verticalAlignment: 'middle',
    };
    const font = {
      Base: { data: new Uint8Array(), fallback: true },
    } as Font;
    const cache = new Map<string | number, unknown>([
      ['getFontKitFont-Base', createMockFont(() => true)],
    ]);

    await uiRender({
      value: 'Centered',
      schema,
      rootElement,
      mode: 'viewer',
      options: { font },
      _cache: cache,
      theme: { colorPrimary: '#1677ff' },
    } as Parameters<typeof uiRender>[0]);

    const container = rootElement.firstElementChild as HTMLDivElement;
    const textBlock = rootElement.querySelector(`#text-${schema.id}`) as HTMLDivElement;

    expect(container.style.justifyContent).toBe('center');
    expect(textBlock.style.height).toBe('');
  });

  it('compensates editable text wrapping for final character spacing', async () => {
    const rootElement = document.createElement('div');
    const schema: TextSchema = {
      ...getTextSchema(),
      readOnly: false,
      textFormat: 'plain',
      characterSpacing: 12,
    };
    const font = {
      Base: { data: new Uint8Array(), fallback: true },
    } as Font;
    const cache = new Map<string | number, unknown>([
      ['getFontKitFont-Base', createMockFont(() => true)],
    ]);

    await uiRender({
      value: '12345',
      schema,
      rootElement,
      mode: 'form',
      options: { font },
      _cache: cache,
      theme: { colorPrimary: '#1677ff' },
    } as Parameters<typeof uiRender>[0]);

    const textBlock = rootElement.querySelector(`#text-${schema.id}`) as HTMLDivElement;

    expect(textBlock.contentEditable).toBe('plaintext-only');
    expect(textBlock.style.letterSpacing).toBe('12pt');
    expect(textBlock.style.width).toBe('calc(100% + 16px)');
  });

  it('renders split inline markdown form chunks as read-only', async () => {
    const rootElement = document.createElement('div');
    const onChange = vi.fn();
    const schema: TextSchema = {
      ...getTextSchema(),
      readOnly: false,
      width: 20,
      __splitRange: { unit: 'textLine', start: 0, end: 1 },
    };
    const font = {
      Base: { data: new Uint8Array(), fallback: true },
    } as Font;
    const cache = new Map<string | number, unknown>([
      ['getFontKitFont-Base', createMockFont(() => true)],
    ]);

    await uiRender({
      value: '**Hello** world',
      schema,
      rootElement,
      mode: 'form',
      onChange,
      options: { font },
      _cache: cache,
      theme: { colorPrimary: '#1677ff' },
    } as Parameters<typeof uiRender>[0]);

    const textBlock = rootElement.querySelector(`#text-${schema.id}`) as HTMLDivElement;
    textBlock.dispatchEvent(new Event('blur'));

    expect(onChange).not.toHaveBeenCalled();
    expect(textBlock.textContent).toContain('Hello');
    expect(textBlock.textContent).not.toContain('world');
  });
});
