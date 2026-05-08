import type { BasePdf, Font, PageOrientation, PageSize, Schema, Template } from '@pdfme/common';
import type {
  ALIGNMENT,
  ImageSchema,
  LIST_STYLE,
  ListItem as SchemaListItem,
  LineSchema,
  CellStyle as SchemaCellStyle,
  ShapeSchema,
  SVGSchema,
  TableSchema,
  TextSchema,
  MultiVariableTextSchema,
} from '@pdfme/schemas/types';
export type { PageOrientation, PageSize, PageSizePreset } from '@pdfme/common';

export type BuiltinKind =
  | 'document'
  | 'page'
  | 'header'
  | 'footer'
  | 'static'
  | 'absolute'
  | 'stack'
  | 'row'
  | 'box'
  | 'spacer'
  | 'text'
  | 'multiVariableText'
  | 'image'
  | 'svg'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'list'
  | 'table'
  | 'pagebreak';

export type PdfJsxElement<K extends BuiltinKind = BuiltinKind> = {
  kind: K;
  props: Record<string, unknown>;
  children: PdfJsxChild[];
  key?: string | number | null;
};

export type PdfJsxFragment = {
  kind: 'fragment';
  children: PdfJsxChild[];
  key?: string | number | null;
};

export type PdfJsxChild =
  | PdfJsxElement
  | PdfJsxFragment
  | string
  | number
  | boolean
  | null
  | undefined
  | PdfJsxChild[];

export type RenderResult = {
  template: Template;
  inputs: Record<string, string>[];
};

export type BoxSides = {
  /** Overrides y for the top side. */
  top?: number;
  /** Overrides x for the right side. */
  right?: number;
  /** Overrides y for the bottom side. */
  bottom?: number;
  /** Overrides x for the left side. */
  left?: number;
  /** Horizontal shorthand used when left/right are omitted. */
  x?: number;
  /** Vertical shorthand used when top/bottom are omitted. */
  y?: number;
};

export type LayoutAlignItems = 'start' | 'center' | 'end' | 'stretch';
export type LayoutJustifyContent = 'start' | 'center' | 'end' | 'space-between';

export type LayoutProps = {
  margin?: number | BoxSides;
  /** Row-only grow weight. Explicit width is used as the basis when present. */
  flexGrow?: number;
  /** Short alias for flexGrow. */
  flex?: number;
};

export type CommonProps = LayoutProps & Partial<Pick<Schema, 'rotate' | 'opacity'>>;

export type DocumentProps = {
  size?: PageSize;
  orientation?: PageOrientation;
  margin?: number | BoxSides;
  font?: string;
  children?: PdfJsxChild;
};

export type PageProps = {
  size?: PageSize;
  orientation?: PageOrientation;
  margin?: number | BoxSides;
  font?: string;
  children?: PdfJsxChild;
};

export type StaticPlacement = 'top' | 'bottom';

export type StaticProps = {
  /** Page edge used to anchor this low-level repeated block. Defaults to top. */
  placement?: StaticPlacement;
  children?: PdfJsxChild;
};

export type HeaderProps = {
  children?: PdfJsxChild;
};

export type FooterProps = {
  children?: PdfJsxChild;
};

export type AbsoluteProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  children?: PdfJsxChild;
};

export type StackProps = LayoutProps & {
  gap?: number;
  width?: number;
  height?: number;
  alignItems?: LayoutAlignItems;
  justifyContent?: LayoutJustifyContent;
  children?: PdfJsxChild;
};

export type RowProps = LayoutProps & {
  gap?: number;
  width?: number;
  height?: number;
  alignItems?: Exclude<LayoutAlignItems, 'stretch'>;
  justifyContent?: LayoutJustifyContent;
  children?: PdfJsxChild;
};

export type BoxProps = CommonProps & {
  width?: number;
  height?: number;
  padding?: number | BoxSides;
  background?: string;
  borderColor?: string;
  borderWidth?: number;
  radius?: number;
  children?: PdfJsxChild;
};

export type SpacerProps = LayoutProps & {
  width?: number;
  height?: number;
};

type TextSchemaProps = Partial<
  Pick<
    TextSchema,
    | 'name'
    | 'width'
    | 'height'
    | 'lineHeight'
    | 'strikethrough'
    | 'underline'
    | 'readOnly'
    | 'required'
    | 'textFormat'
    | 'overflow'
  >
>;

export type TextProps = CommonProps &
  TextSchemaProps & {
    children?: PdfJsxChild;
    size?: TextSchema['fontSize'];
    font?: TextSchema['fontName'];
    align?: TextSchema['alignment'];
    valign?: TextSchema['verticalAlignment'];
    spacing?: TextSchema['characterSpacing'];
    color?: TextSchema['fontColor'];
    background?: TextSchema['backgroundColor'];
    borderColor?: string;
    borderWidth?: number | BoxSides;
    padding?: number | BoxSides;
    dynamicFontSize?: Partial<NonNullable<TextSchema['dynamicFontSize']>>;
  };

export type MultiVariableTextValues = Record<string, string | number | boolean | null | undefined>;

type MultiVariableTextSchemaProps = Partial<
  Pick<
    MultiVariableTextSchema,
    | 'name'
    | 'width'
    | 'height'
    | 'lineHeight'
    | 'strikethrough'
    | 'underline'
    | 'readOnly'
    | 'required'
    | 'textFormat'
    | 'overflow'
  >
>;

export type MultiVariableTextProps = CommonProps &
  MultiVariableTextSchemaProps & {
    children?: PdfJsxChild;
    text?: string;
    variables?: string[];
    values?: MultiVariableTextValues;
    size?: MultiVariableTextSchema['fontSize'];
    font?: MultiVariableTextSchema['fontName'];
    align?: MultiVariableTextSchema['alignment'];
    valign?: MultiVariableTextSchema['verticalAlignment'];
    spacing?: MultiVariableTextSchema['characterSpacing'];
    color?: MultiVariableTextSchema['fontColor'];
    background?: MultiVariableTextSchema['backgroundColor'];
    borderColor?: string;
    borderWidth?: number | BoxSides;
    padding?: number | BoxSides;
    dynamicFontSize?: Partial<NonNullable<MultiVariableTextSchema['dynamicFontSize']>>;
  };

type ImageSchemaProps = Partial<
  Pick<ImageSchema, 'name' | 'width' | 'height' | 'readOnly' | 'required'>
>;

export type ImageProps = CommonProps &
  ImageSchemaProps & {
    src?: string;
  };

type SvgSchemaProps = Partial<
  Pick<SVGSchema, 'name' | 'width' | 'height' | 'readOnly' | 'required'>
>;

export type SvgProps = SvgSchemaProps & {
  svg?: string;
  children?: PdfJsxChild;
} & CommonProps;

type ShapeSchemaProps = Partial<
  Pick<ShapeSchema, 'name' | 'width' | 'height' | 'borderWidth' | 'borderColor' | 'radius'>
>;

export type RectangleProps = CommonProps &
  ShapeSchemaProps & {
    fill?: ShapeSchema['color'];
  };

export type EllipseProps = CommonProps &
  Omit<ShapeSchemaProps, 'radius'> & {
    fill?: ShapeSchema['color'];
  };

export type LineProps = CommonProps &
  Partial<Pick<LineSchema, 'name' | 'width' | 'height' | 'color'>>;

export type ListItem = string | { text: SchemaListItem['text']; level?: SchemaListItem['level'] };

export type ListProps = CommonProps & {
  name?: string;
  items?: ListItem[];
  children?: PdfJsxChild;
  width?: number;
  height?: number;
  size?: number;
  font?: string;
  align?: ALIGNMENT;
  lineHeight?: number;
  spacing?: number;
  color?: string;
  background?: string;
  readOnly?: boolean;
  required?: boolean;
  listStyle?: LIST_STYLE;
  markerWidth?: number;
  markerGap?: number;
  indentSize?: number;
  itemSpacing?: number;
};

export type CellStyle = Partial<Omit<SchemaCellStyle, 'borderWidth' | 'padding'>> & {
  borderWidth?: number | BoxSides;
  padding?: number | BoxSides;
};

export type TableProps = CommonProps & {
  name?: string;
  head: string[];
  rows?: (string | number)[][];
  data?: (string | number)[][];
  /**
   * Relative column width weights, not millimeter widths. Values are normalized to pdfme
   * headWidthPercentages. Missing or invalid weights default to 1.
   */
  columnWeights?: number[];
  width?: number;
  height?: number;
  font?: string;
  fontSize?: number;
  showHead?: boolean;
  repeatHead?: boolean;
  rowHeight?: number;
  headerHeight?: number;
  readOnly?: boolean;
  required?: boolean;
  tableStyles?: Partial<TableSchema['tableStyles']>;
  headStyles?: CellStyle;
  bodyStyles?: CellStyle & { alternateBackgroundColor?: string };
  columnStyles?: TableSchema['columnStyles'];
};

export type PageBreakProps = Record<string, unknown>;

export type RenderOptions = {
  basePdf?: BasePdf;
  font?: Font;
};
