import { createElementNode } from './node.js';
import type {
  AbsoluteProps,
  BoxProps,
  DocumentProps,
  EllipseProps,
  FooterProps,
  HeaderProps,
  ImageProps,
  LineProps,
  ListProps,
  MultiVariableTextProps,
  PageBreakProps,
  PageProps,
  RectangleProps,
  RowProps,
  SpacerProps,
  StackProps,
  StaticProps,
  SvgProps,
  TableProps,
  TextProps,
} from './types.js';

const makeBuiltin =
  <Props extends Record<string, unknown>, K extends Parameters<typeof createElementNode>[0]>(
    kind: K,
  ) =>
  (props: Props): ReturnType<typeof createElementNode<K>> =>
    createElementNode(kind, props);

export const Document = makeBuiltin<DocumentProps, 'document'>('document');
export const Page = makeBuiltin<PageProps, 'page'>('page');
export const Static = makeBuiltin<StaticProps, 'static'>('static');
export const Header = makeBuiltin<HeaderProps, 'header'>('header');
export const Footer = makeBuiltin<FooterProps, 'footer'>('footer');
export const Absolute = makeBuiltin<AbsoluteProps, 'absolute'>('absolute');
export const Stack = makeBuiltin<StackProps, 'stack'>('stack');
export const Row = makeBuiltin<RowProps, 'row'>('row');
export const Box = makeBuiltin<BoxProps, 'box'>('box');
export const Spacer = makeBuiltin<SpacerProps, 'spacer'>('spacer');
export const Text = makeBuiltin<TextProps, 'text'>('text');
export const MultiVariableText = makeBuiltin<MultiVariableTextProps, 'multiVariableText'>(
  'multiVariableText',
);
export const Image = makeBuiltin<ImageProps, 'image'>('image');
export const Svg = makeBuiltin<SvgProps, 'svg'>('svg');
export const Rectangle = makeBuiltin<RectangleProps, 'rectangle'>('rectangle');
export const Ellipse = makeBuiltin<EllipseProps, 'ellipse'>('ellipse');
export const Line = makeBuiltin<LineProps, 'line'>('line');
export const List = makeBuiltin<ListProps, 'list'>('list');
export const Table = makeBuiltin<TableProps, 'table'>('table');
export const PageBreak = (props?: PageBreakProps) => createElementNode('pagebreak', props);
