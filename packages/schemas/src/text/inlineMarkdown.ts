import { normalizeLinkHref } from '@pdfme/common';
import type { RichTextRun } from './types.js';

type InlineStyle = Omit<RichTextRun, 'text'>;

const MARKDOWN_ESCAPABLE_CHARS = new Set(['\\', '*', '~', '`', '[', ']', '(', ')']);
const MARKDOWN_ESCAPE_PATTERN = /[\\*~`[\]()]/g;
const MARKDOWN_UNESCAPE_PATTERN = /\\([\\*~`[\]()])/g;

const sameStyle = (a: InlineStyle, b: InlineStyle) =>
  Boolean(a.bold) === Boolean(b.bold) &&
  Boolean(a.italic) === Boolean(b.italic) &&
  Boolean(a.strikethrough) === Boolean(b.strikethrough) &&
  Boolean(a.code) === Boolean(b.code) &&
  a.href === b.href;

const appendRun = (runs: RichTextRun[], text: string, style: InlineStyle) => {
  if (!text) return;

  const lastRun = runs.at(-1);
  if (lastRun && sameStyle(lastRun, style)) {
    lastRun.text += text;
    return;
  }

  runs.push({
    text,
    ...(style.bold ? { bold: true } : {}),
    ...(style.italic ? { italic: true } : {}),
    ...(style.strikethrough ? { strikethrough: true } : {}),
    ...(style.code ? { code: true } : {}),
    ...(style.href ? { href: style.href } : {}),
  });
};

const findClosingDelimiter = (value: string, delimiter: string, from: number): number => {
  for (let i = from; i < value.length; i++) {
    if (value[i] === '\\') {
      i += 1;
      continue;
    }

    if (delimiter !== '`' && value[i] === '`') {
      const codeEnd = findClosingDelimiter(value, '`', i + 1);
      if (codeEnd === -1) continue;
      i = codeEnd;
      continue;
    }

    if (value.startsWith(delimiter, i)) {
      return i;
    }
  }

  return -1;
};

const getDelimiter = (value: string, index: number) => {
  if (value[index] === '`') return '`';
  if (value.startsWith('***', index)) return '***';
  if (value.startsWith('**', index)) return '**';
  if (value.startsWith('~~', index)) return '~~';
  if (value[index] === '*') return '*';
  return '';
};

const findLinkLabelEnd = (value: string, from: number, to: number): number => {
  for (let index = from; index < to; index += 1) {
    if (value[index] === '\\') {
      index += 1;
      continue;
    }

    if (value[index] === ']') return index;
  }

  return -1;
};

const findLinkDestinationEnd = (value: string, from: number, to: number): number => {
  let depth = 0;

  for (let index = from; index < to; index += 1) {
    if (value[index] === '\\') {
      index += 1;
      continue;
    }

    if (value[index] === '(') {
      depth += 1;
      continue;
    }

    if (value[index] === ')') {
      if (depth === 0) return index;
      depth -= 1;
    }
  }

  return -1;
};

const parseLinkAt = (value: string, index: number, to: number) => {
  if (value[index] !== '[') return undefined;

  const labelEnd = findLinkLabelEnd(value, index + 1, to);
  if (labelEnd === -1 || value[labelEnd + 1] !== '(') return undefined;

  const destinationStart = labelEnd + 2;
  const destinationEnd = findLinkDestinationEnd(value, destinationStart, to);
  if (destinationEnd === -1) return undefined;

  const href = value
    .slice(destinationStart, destinationEnd)
    .replace(MARKDOWN_UNESCAPE_PATTERN, '$1');
  const safeHref = normalizeLinkHref(href);
  if (!safeHref) return undefined;

  return {
    labelStart: index + 1,
    labelEnd,
    href: safeHref,
    end: destinationEnd + 1,
  };
};

const mergeStyle = (style: InlineStyle, delimiter: string): InlineStyle => {
  if (delimiter === '***') {
    return { ...style, bold: true, italic: true };
  }
  if (delimiter === '**') {
    return { ...style, bold: true };
  }
  if (delimiter === '*') {
    return { ...style, italic: true };
  }
  if (delimiter === '~~') {
    return { ...style, strikethrough: true };
  }
  return style;
};

const parseRange = (value: string, from: number, to: number, style: InlineStyle): RichTextRun[] => {
  const runs: RichTextRun[] = [];
  let buffer = '';

  const flush = () => {
    appendRun(runs, buffer, style);
    buffer = '';
  };

  for (let index = from; index < to; index++) {
    const char = value[index];

    if (char === '\\' && index + 1 < to && MARKDOWN_ESCAPABLE_CHARS.has(value[index + 1])) {
      buffer += value[index + 1];
      index += 1;
      continue;
    }

    const link = style.href ? undefined : parseLinkAt(value, index, to);
    if (link) {
      flush();
      const nestedRuns = parseRange(value, link.labelStart, link.labelEnd, {
        ...style,
        href: link.href,
      });
      nestedRuns.forEach((run) => appendRun(runs, run.text, run));
      index = link.end - 1;
      continue;
    }

    const delimiter = getDelimiter(value, index);
    if (!delimiter) {
      buffer += char;
      continue;
    }

    const closingIndex = findClosingDelimiter(value, delimiter, index + delimiter.length);
    if (closingIndex === -1 || closingIndex + delimiter.length > to) {
      buffer += char;
      continue;
    }

    flush();

    if (delimiter === '`') {
      appendRun(
        runs,
        value.slice(index + 1, closingIndex).replace(MARKDOWN_UNESCAPE_PATTERN, '$1'),
        { ...style, code: true },
      );
    } else {
      const nestedRuns = parseRange(
        value,
        index + delimiter.length,
        closingIndex,
        mergeStyle(style, delimiter),
      );
      nestedRuns.forEach((run) => appendRun(runs, run.text, run));
    }

    index = closingIndex + delimiter.length - 1;
  }

  flush();
  return runs;
};

export const parseInlineMarkdown = (value: string): RichTextRun[] => {
  if (!value) return [];
  return parseRange(value, 0, value.length, {});
};

export const escapeInlineMarkdown = (value: string): string =>
  value.replace(MARKDOWN_ESCAPE_PATTERN, (char) => `\\${char}`);

export const stripInlineMarkdown = (value: string): string =>
  parseInlineMarkdown(value)
    .map((run) => run.text)
    .join('');
