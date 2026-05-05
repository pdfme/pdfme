import type { BasePdf, Font, PageOrientation, PageSize, Schema, Template } from '@pdfme/common';
import type {
  ALIGNMENT,
  LIST_STYLE,
  ListItem as SchemaListItem,
  CellStyle as SchemaCellStyle,
  TableSchema,
  TextSchema,
} from '@pdfme/schemas/types';
export type { PageOrientation, PageSize, PageSizePreset } from '@pdfme/common';

export type BuiltinKind =
  | 'page'
  | 'stack'
  | 'row'
  | 'box'
  | 'spacer'
  | 'text'
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

export type CommonProps = Partial<Pick<Schema, 'rotate' | 'opacity'>>;

export type PageProps = {
  size?: PageSize;
  orientation?: PageOrientation;
  margin?: number | BoxSides;
  font?: string;
  children?: PdfJsxChild;
};

export type StackProps = {
  gap?: number;
  width?: number;
  children?: PdfJsxChild;
};

export type RowProps = {
  gap?: number;
  width?: number;
  height?: number;
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

export type SpacerProps = {
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
    borderWidth?: number;
    dynamicFontSize?: Partial<NonNullable<TextSchema['dynamicFontSize']>>;
  };

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
  /** Column width percentages passed to pdfme headWidthPercentages. */
  widths?: number[];
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
