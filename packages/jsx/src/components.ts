import { createElementNode } from './node.js';
import type {
  BoxProps,
  ListProps,
  MultiVariableTextProps,
  PageBreakProps,
  PageProps,
  RowProps,
  SpacerProps,
  StackProps,
  TableProps,
  TextProps,
} from './types.js';

const makeBuiltin =
  <Props extends Record<string, unknown>, K extends Parameters<typeof createElementNode>[0]>(
    kind: K,
  ) =>
  (props: Props): ReturnType<typeof createElementNode<K>> =>
    createElementNode(kind, props);

export const Page = makeBuiltin<PageProps, 'page'>('page');
export const Stack = makeBuiltin<StackProps, 'stack'>('stack');
export const Row = makeBuiltin<RowProps, 'row'>('row');
export const Box = makeBuiltin<BoxProps, 'box'>('box');
export const Spacer = makeBuiltin<SpacerProps, 'spacer'>('spacer');
export const Text = makeBuiltin<TextProps, 'text'>('text');
export const MultiVariableText = makeBuiltin<MultiVariableTextProps, 'multiVariableText'>(
  'multiVariableText',
);
export const List = makeBuiltin<ListProps, 'list'>('list');
export const Table = makeBuiltin<TableProps, 'table'>('table');
export const PageBreak = (props?: PageBreakProps) => createElementNode('pagebreak', props);
