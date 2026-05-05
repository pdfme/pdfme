import type { BuiltinKind, PdfJsxChild, PdfJsxElement, PdfJsxFragment } from './types.js';

export const Fragment = Symbol.for('@pdfme/jsx.fragment');

export const isPdfJsxElement = (value: unknown): value is PdfJsxElement =>
  typeof value === 'object' &&
  value !== null &&
  'kind' in value &&
  typeof (value as { kind?: unknown }).kind === 'string';

export const isPdfJsxFragment = (value: unknown): value is PdfJsxFragment =>
  typeof value === 'object' &&
  value !== null &&
  'kind' in value &&
  (value as { kind?: unknown }).kind === 'fragment';

export const normalizeChildren = (children: unknown): PdfJsxChild[] => {
  if (children === undefined) return [];
  return Array.isArray(children) ? (children as PdfJsxChild[]) : [children as PdfJsxChild];
};

export const createElementNode = <K extends BuiltinKind>(
  kind: K,
  rawProps: Record<string, unknown> | null | undefined,
  key?: string | number | null,
): PdfJsxElement<K> => {
  const { children, ...props } = rawProps ?? {};
  return {
    kind,
    props,
    children: normalizeChildren(children),
    key,
  };
};

export const createFragmentNode = (
  rawProps: Record<string, unknown> | null | undefined,
  key?: string | number | null,
): PdfJsxFragment => ({
  kind: 'fragment',
  children: normalizeChildren(rawProps?.children),
  key,
});

export const cloneElementWithChildren = (
  element: PdfJsxElement,
  children: PdfJsxChild[],
): PdfJsxElement => ({
  ...element,
  children,
});
