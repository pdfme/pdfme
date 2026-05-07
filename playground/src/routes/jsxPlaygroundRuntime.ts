import type { Font } from '@pdfme/common';
import {
  Absolute,
  Box,
  Ellipse,
  Footer,
  Header,
  Image,
  Line,
  List,
  MultiVariableText,
  Page,
  PageBreak,
  Rectangle,
  Row,
  Spacer,
  Stack,
  Static,
  Svg,
  Table,
  Text,
  renderToTemplate,
  type PdfJsxChild,
  type RenderResult,
} from '@pdfme/jsx';
import { Fragment, jsx } from '@pdfme/jsx/jsx-runtime';
import { transform } from 'sucrase';

const RESTRICTED_GLOBALS = [
  'caches',
  'document',
  'eval',
  'fetch',
  'Function',
  'globalThis',
  'indexedDB',
  'localStorage',
  'location',
  'navigator',
  'opener',
  'parent',
  'postMessage',
  'self',
  'sessionStorage',
  'top',
  'WebSocket',
  'window',
  'XMLHttpRequest',
];

const IMPORT_EXPORT_PATTERN = /^\s*(import|export)\b/m;
const RESTRICTED_GLOBAL_PATTERN = new RegExp(`\\b(${RESTRICTED_GLOBALS.join('|')})\\b`);

const jsxScope = {
  Absolute,
  Box,
  Ellipse,
  Footer,
  Header,
  Image,
  Line,
  List,
  MultiVariableText,
  Page,
  PageBreak,
  Rectangle,
  Row,
  Spacer,
  Stack,
  Static,
  Svg,
  Table,
  Text,
};

const createElement = (
  type: Parameters<typeof jsx>[0],
  props: Record<string, unknown> | null,
  ...children: unknown[]
): PdfJsxChild => {
  const nextProps = { ...props };
  if (children.length > 0) {
    nextProps.children = children.length === 1 ? children[0] : children;
  }
  return jsx(type, nextProps);
};

const assertAllowedJsxSource = (source: string) => {
  if (IMPORT_EXPORT_PATTERN.test(source)) {
    throw new Error(
      'The JSX playground beta does not support import/export. Use a function body that returns <Page> nodes.',
    );
  }

  const restrictedGlobal = source.match(RESTRICTED_GLOBAL_PATTERN)?.[1];
  if (restrictedGlobal) {
    throw new Error(
      `The JSX playground beta does not allow ${restrictedGlobal}. Only pdfme JSX components are available.`,
    );
  }
};

export const compileJsxFunctionBody = (source: string) => {
  assertAllowedJsxSource(source);

  try {
    return transform(source, {
      filePath: 'playground.tsx',
      jsxFragmentPragma: 'Fragment',
      jsxPragma: 'createElement',
      production: true,
      transforms: ['typescript', 'jsx'],
    }).code;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
};

export const evaluateJsxFunctionBody = (source: string): PdfJsxChild => {
  const compiled = compileJsxFunctionBody(source);
  const scope = { ...jsxScope, Fragment, createElement };
  const scopeNames = Object.keys(scope);
  const scopeValues = Object.values(scope);
  const evaluate = new Function(...scopeNames, `"use strict";\n${compiled}`);
  return evaluate(...scopeValues) as PdfJsxChild;
};

export const renderJsxSource = async (source: string, font?: Font): Promise<RenderResult> =>
  renderToTemplate(evaluateJsxFunctionBody(source), { font });
