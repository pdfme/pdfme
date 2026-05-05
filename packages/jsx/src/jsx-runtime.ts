import { createFragmentNode, Fragment } from './node.js';
import type { PdfJsxChild, PdfJsxElement, PdfJsxFragment } from './types.js';

type Component = (props: Record<string, unknown>) => PdfJsxChild;

export { Fragment };

export const jsx = (
  type: Component | typeof Fragment,
  props: Record<string, unknown> | null,
  key?: string | number | null,
): PdfJsxChild => {
  if (type === Fragment) return createFragmentNode(props, key);
  if (typeof type === 'function') return type({ ...props, key });
  throw new Error('@pdfme/jsx: intrinsic JSX elements are not supported. Use pdfme components.');
};

export const jsxs = jsx;

export namespace JSX {
  export type Element = PdfJsxElement | PdfJsxFragment;
  export interface ElementChildrenAttribute {
    children: unknown;
  }
  export interface IntrinsicElements {}
}
