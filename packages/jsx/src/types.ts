import type { BasePdf, PageOrientation, PageSize, Schema, Template } from '@pdfme/common';
import type {
  ALIGNMENT,
  DYNAMIC_FONT_SIZE_FIT,
  LIST_STYLE,
  ListItem as SchemaListItem,
  ListSchema,
  CellStyle as SchemaCellStyle,
  TableSchema,
  TEXT_FORMAT,
  TextSchema,
  VERTICAL_ALIGNMENT,
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
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  x?: number;
  y?: number;
};

export type CommonProps = {
  rotate?: number;
  opacity?: number;
};

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

export type TextProps = CommonProps & {
  name?: string;
  children?: PdfJsxChild;
  width?: number;
  height?: number;
  size?: number;
  font?: string;
  align?: ALIGNMENT;
  valign?: VERTICAL_ALIGNMENT;
  lineHeight?: number;
  spacing?: number;
  color?: string;
  background?: string;
  borderColor?: string;
  borderWidth?: number;
  strikethrough?: boolean;
  underline?: boolean;
  readOnly?: boolean;
  required?: boolean;
  textFormat?: TEXT_FORMAT;
  dynamicFontSize?: {
    min?: number;
    max?: number;
    fit?: DYNAMIC_FONT_SIZE_FIT;
  };
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
};

export type PdfJsxSchema = Schema | TextSchema | ListSchema | TableSchema;
