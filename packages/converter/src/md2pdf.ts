import {
  normalizeLinkHref,
  pt2mm,
  resolvePageSize,
  type BlankPdf,
  type PageOrientation,
  type PageSize,
  type Schema,
  type Template,
} from '@pdfme/common';
import type {
  BlockContent,
  Blockquote,
  Code,
  Heading,
  Image,
  InlineCode,
  Link,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
  Table,
  TableCell,
  TableRow,
} from 'mdast';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

type BoxSides = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  x?: number;
  y?: number;
};
type ResolvedBoxSides = { top: number; right: number; bottom: number; left: number };
type HeadingDepth = 1 | 2 | 3 | 4 | 5 | 6;
type MarkdownMargin = number | [number, number, number, number] | BoxSides;

export type Md2PdfOptions = {
  page?: {
    size?: PageSize;
    orientation?: PageOrientation;
    margin?: MarkdownMargin;
  };
  basePdf?: BlankPdf;
  style?: {
    fontName?: string;
    fontSize?: number;
    lineHeight?: number;
    fontColor?: string;
    headingScale?: Partial<Record<HeadingDepth, number>>;
  };
};

export type Md2PdfResult = {
  template: Template;
  inputs: Record<string, string>[];
};

type Builder = {
  basePdf: BlankPdf;
  contentFrame: { x: number; y: number; width: number; height: number };
  cursorY: number;
  fontName?: string;
  fontSize: number;
  lineHeight: number;
  fontColor: string;
  headingScale: Record<HeadingDepth, number>;
  nameCounters: Record<string, number>;
  schemas: Schema[];
  usedNames: Set<string>;
};

type TableCellStyle = {
  fontName?: string;
  alignment: 'left' | 'center' | 'right';
  verticalAlignment: 'top' | 'middle' | 'bottom';
  fontSize: number;
  lineHeight: number;
  characterSpacing: number;
  fontColor: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: ResolvedBoxSides;
  padding: ResolvedBoxSides;
  alternateBackgroundColor?: string;
};

const DEFAULT_PAGE_MARGIN: [number, number, number, number] = [20, 15, 20, 15];
const DEFAULT_FONT_SIZE = 10;
const DEFAULT_LINE_HEIGHT = 1.25;
const DEFAULT_FONT_COLOR = '#111827';
const DEFAULT_HEADING_SCALE: Record<HeadingDepth, number> = {
  1: 2,
  2: 1.65,
  3: 1.35,
  4: 1.15,
  5: 1,
  6: 1,
};
const BLOCK_GAP = 4;
const LIST_ITEM_SPACING = 1.4;
const TABLE_HEADER_HEIGHT = 8.5;
const TABLE_ROW_HEIGHT = 7.5;
const IMAGE_HEIGHT = 45;
const CODE_BLOCK_BACKGROUND_COLOR = '#f6f8fa';
const CODE_BLOCK_BORDER_COLOR = '#d0d7de';
const CODE_BLOCK_BORDER_WIDTH = 0.1;
const CODE_BLOCK_PADDING: ResolvedBoxSides = { top: 2, right: 3, bottom: 2, left: 3 };
const BLOCKQUOTE_BACKGROUND_COLOR = '#f8fafc';
const BLOCKQUOTE_BORDER_COLOR = '#d0d7de';
const BLOCKQUOTE_BORDER_WIDTH: ResolvedBoxSides = { top: 0, right: 0, bottom: 0, left: 0.8 };
const BLOCKQUOTE_PADDING: ResolvedBoxSides = { top: 2, right: 3, bottom: 2, left: 3 };
const HORIZONTAL_RULE_COLOR = '#d0d7de';
const HORIZONTAL_RULE_HEIGHT = 0.25;
const TABLE_BORDER_COLOR = '#d0d7de';
const TABLE_CELL_BORDER_WIDTH = 0.1;
const TABLE_HEAD_BACKGROUND_COLOR = '#f6f8fa';
const TABLE_BODY_ALTERNATE_BACKGROUND_COLOR = '#f9fafb';
const TABLE_CELL_PADDING = 3;

const MARKDOWN_ESCAPE_PATTERN = /[\\*~`[\]()]/g;
const DATA_IMAGE_PATTERN = /^data:image\/(?:png|jpe?g);base64,/i;
const RENDERABLE_BLOCK_TYPES = new Set([
  'blockquote',
  'code',
  'heading',
  'html',
  'list',
  'paragraph',
  'table',
  'thematicBreak',
]);

const markdownProcessor = unified().use(remarkParse).use(remarkGfm);

export const md2pdf = async (
  markdown: string,
  options: Md2PdfOptions = {},
): Promise<Md2PdfResult> => {
  const root = markdownProcessor.parse(markdown) as Root;
  const builder = createBuilder(options);

  root.children.forEach((node) => renderBlock(node, builder));

  return {
    template: {
      basePdf: builder.basePdf,
      schemas: [builder.schemas],
    },
    inputs: [{}],
  };
};

const createBuilder = (options: Md2PdfOptions): Builder => {
  const basePdf = options.basePdf ?? createBlankPdf(options);
  const [top, right, bottom, left] = basePdf.padding;
  const headingScale = { ...DEFAULT_HEADING_SCALE, ...options.style?.headingScale };

  return {
    basePdf,
    contentFrame: {
      x: left,
      y: top,
      width: Math.max(0, basePdf.width - left - right),
      height: Math.max(0, basePdf.height - top - bottom),
    },
    cursorY: top,
    fontName: options.style?.fontName,
    fontSize: options.style?.fontSize ?? DEFAULT_FONT_SIZE,
    lineHeight: options.style?.lineHeight ?? DEFAULT_LINE_HEIGHT,
    fontColor: options.style?.fontColor ?? DEFAULT_FONT_COLOR,
    headingScale,
    nameCounters: {},
    schemas: [],
    usedNames: new Set(),
  };
};

const createBlankPdf = (options: Md2PdfOptions): BlankPdf => {
  const pageSize = resolvePageSize(
    options.page?.size ?? 'A4',
    options.page?.orientation ?? 'portrait',
  );
  return {
    width: pageSize.width,
    height: pageSize.height,
    padding: resolveMargin(options.page?.margin ?? DEFAULT_PAGE_MARGIN),
  };
};

const resolveMargin = (margin: MarkdownMargin): [number, number, number, number] => {
  if (typeof margin === 'number') return [margin, margin, margin, margin];
  if (Array.isArray(margin)) return margin;

  const x = margin.x ?? 0;
  const y = margin.y ?? 0;
  return [margin.top ?? y, margin.right ?? x, margin.bottom ?? y, margin.left ?? x];
};

const renderBlock = (node: RootContent | BlockContent, builder: Builder): void => {
  switch (node.type) {
    case 'heading':
      renderHeading(node, builder);
      return;
    case 'paragraph':
      renderParagraph(node, builder);
      return;
    case 'list':
      renderList(node, builder);
      return;
    case 'code':
      renderCode(node, builder);
      return;
    case 'blockquote':
      renderBlockquote(node, builder);
      return;
    case 'table':
      renderTable(node, builder);
      return;
    case 'thematicBreak':
      renderLine(builder);
      return;
    case 'html':
    case 'definition':
    case 'footnoteDefinition':
    case 'yaml':
      return;
    default:
      renderNestedBlocks(node, builder);
  }
};

const renderNestedBlocks = (node: RootContent | BlockContent, builder: Builder): void => {
  if ('children' in node && Array.isArray(node.children)) {
    node.children.forEach((child) => {
      if (isBlockContent(child)) renderBlock(child, builder);
    });
  }
};

const renderHeading = (node: Heading, builder: Builder): void => {
  const depth = Math.min(Math.max(node.depth, 1), 6) as HeadingDepth;
  const content = renderInlineChildren(node.children);
  const fontSize = builder.fontSize * builder.headingScale[depth];
  addTextSchema(builder, {
    name: resolveName(builder, slugify(toPlainText(node)) || `heading_${depth}`),
    content,
    fontSize,
    height: estimateTextHeight(content, fontSize, builder.lineHeight),
    gap: depth <= 1 ? 5 : depth === 2 ? 4.5 : BLOCK_GAP,
    textFormat: 'inline-markdown',
  });
};

const renderParagraph = (node: Paragraph, builder: Builder): void => {
  if (node.children.length === 1 && node.children[0]?.type === 'image') {
    renderImage(node.children[0], builder);
    return;
  }

  const content = renderInlineChildren(node.children);
  if (!content.trim()) return;
  addTextSchema(builder, {
    content,
    textFormat: 'inline-markdown',
  });
};

const renderList = (node: List, builder: Builder): void => {
  const items = collectListItems(node);
  if (items.length === 0) return;

  const fontSize = builder.fontSize;
  const height =
    items.length * estimateTextHeight('', fontSize, builder.lineHeight) +
    Math.max(0, items.length - 1) * LIST_ITEM_SPACING;

  const schema: Schema = {
    name: resolveAutoName(builder, 'list'),
    type: 'list',
    content: JSON.stringify(items),
    position: { x: builder.contentFrame.x, y: builder.cursorY },
    width: builder.contentFrame.width,
    height,
    readOnly: true,
    alignment: 'left',
    verticalAlignment: 'top',
    fontSize,
    fontName: builder.fontName,
    lineHeight: builder.lineHeight,
    characterSpacing: 0,
    fontColor: builder.fontColor,
    backgroundColor: '',
    listStyle: node.ordered ? 'ordered' : 'bullet',
    markerWidth: 6,
    markerGap: 2,
    indentSize: 6,
    itemSpacing: LIST_ITEM_SPACING,
    textFormat: 'inline-markdown',
    overflow: 'expand',
  };

  addSchema(builder, schema);
};

const renderCode = (node: Code, builder: Builder): void => {
  const content = node.value;
  addTextSchema(builder, {
    content,
    backgroundColor: CODE_BLOCK_BACKGROUND_COLOR,
    borderColor: CODE_BLOCK_BORDER_COLOR,
    borderWidth: resolveBoxSides(CODE_BLOCK_BORDER_WIDTH),
    padding: CODE_BLOCK_PADDING,
    textFormat: 'plain',
  });
};

const renderBlockquote = (node: Blockquote, builder: Builder): void => {
  const content = node.children
    .map((child) => blockToMarkdown(child))
    .join('\n')
    .trim();

  if (!content.trim()) return;
  addTextSchema(builder, {
    content,
    backgroundColor: BLOCKQUOTE_BACKGROUND_COLOR,
    borderColor: BLOCKQUOTE_BORDER_COLOR,
    borderWidth: BLOCKQUOTE_BORDER_WIDTH,
    padding: BLOCKQUOTE_PADDING,
    textFormat: 'inline-markdown',
  });
};

const renderTable = (node: Table, builder: Builder): void => {
  const rows = node.children.map(tableRowToStrings).filter((row) => row.length > 0);
  if (rows.length === 0) return;

  const columnCount = Math.max(...rows.map((row) => row.length));
  const head = normalizeRowLength(rows[0], columnCount);
  const body = rows.slice(1).map((row) => normalizeRowLength(row, columnCount));
  const height = TABLE_HEADER_HEIGHT + Math.max(1, body.length) * TABLE_ROW_HEIGHT;
  const columnWidths = Array.from({ length: columnCount }, () => 100 / columnCount);

  const schema: Schema = {
    name: resolveAutoName(builder, 'table'),
    type: 'table',
    content: JSON.stringify(body),
    position: { x: builder.contentFrame.x, y: builder.cursorY },
    width: builder.contentFrame.width,
    height,
    readOnly: true,
    showHead: true,
    repeatHead: false,
    head,
    headWidthPercentages: columnWidths,
    tableStyles: {
      borderColor: TABLE_BORDER_COLOR,
      borderWidth: 0.2,
    },
    headStyles: {
      ...defaultCellStyle(builder),
      backgroundColor: TABLE_HEAD_BACKGROUND_COLOR,
      borderColor: TABLE_BORDER_COLOR,
      borderWidth: resolveBoxSides(TABLE_CELL_BORDER_WIDTH),
    },
    bodyStyles: {
      ...defaultCellStyle(builder),
      borderColor: TABLE_BORDER_COLOR,
      borderWidth: resolveBoxSides(TABLE_CELL_BORDER_WIDTH),
      alternateBackgroundColor: TABLE_BODY_ALTERNATE_BACKGROUND_COLOR,
    },
    columnStyles: {},
  };

  addSchema(builder, schema);
};

const renderImage = (node: Image, builder: Builder): void => {
  if (!DATA_IMAGE_PATTERN.test(node.url)) {
    const link = normalizeLinkHref(node.url);
    const label = node.alt || node.title || node.url;
    addTextSchema(builder, {
      content: link
        ? `[${escapeInlineMarkdown(label)}](${escapeLinkDestination(link)})`
        : escapeInlineMarkdown(label),
      textFormat: 'inline-markdown',
    });
    return;
  }

  const schema: Schema = {
    name: resolveAutoName(builder, 'image'),
    type: 'image',
    content: node.url,
    position: { x: builder.contentFrame.x, y: builder.cursorY },
    width: builder.contentFrame.width,
    height: IMAGE_HEIGHT,
    readOnly: true,
  };

  addSchema(builder, schema);
};

const renderLine = (builder: Builder): void => {
  const schema: Schema = {
    name: resolveAutoName(builder, 'line'),
    type: 'line',
    position: { x: builder.contentFrame.x, y: builder.cursorY },
    width: builder.contentFrame.width,
    height: HORIZONTAL_RULE_HEIGHT,
    readOnly: true,
    color: HORIZONTAL_RULE_COLOR,
  };

  addSchema(builder, schema);
};

const addTextSchema = (
  builder: Builder,
  options: {
    name?: string;
    content: string;
    fontSize?: number;
    height?: number;
    gap?: number;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: ResolvedBoxSides;
    padding?: ResolvedBoxSides;
    textFormat?: 'plain' | 'inline-markdown';
    x?: number;
    width?: number;
  },
): void => {
  const fontSize = options.fontSize ?? builder.fontSize;
  const content = options.content;
  const boxVerticalInset = getBoxVerticalInset(options);
  const schema: Schema = {
    name: options.name ?? resolveAutoName(builder, 'text'),
    type: 'text',
    content,
    position: { x: options.x ?? builder.contentFrame.x, y: builder.cursorY },
    width: options.width ?? builder.contentFrame.width,
    height:
      (options.height ?? estimateTextHeight(content, fontSize, builder.lineHeight)) +
      boxVerticalInset,
    readOnly: true,
    alignment: 'left',
    verticalAlignment: 'top',
    fontSize,
    fontName: builder.fontName,
    lineHeight: builder.lineHeight,
    characterSpacing: 0,
    fontColor: builder.fontColor,
    backgroundColor: options.backgroundColor ?? '',
    borderColor: options.borderColor,
    borderWidth: options.borderWidth,
    padding: options.padding,
    textFormat: options.textFormat ?? 'plain',
    overflow: 'expand',
  };

  addSchema(builder, schema, options.gap);
};

const addSchema = (builder: Builder, schema: Schema, gap = BLOCK_GAP): void => {
  builder.schemas.push(schema);
  builder.cursorY += schema.height + gap;
};

const collectListItems = (node: List, level = 0): string[] =>
  node.children.flatMap((item) => {
    const prefix = typeof item.checked === 'boolean' ? `[${item.checked ? 'x' : ' '}] ` : '';
    const text = item.children
      .filter((child) => child.type !== 'list')
      .map((child) => blockToMarkdown(child))
      .join(' ')
      .trim();
    const current = `${'\t'.repeat(level)}${prefix}${text}`;
    const nested = item.children
      .filter(isList)
      .flatMap((child) => collectListItems(child, level + 1));
    return [current, ...nested];
  });

const blockToMarkdown = (node: RootContent | BlockContent): string => {
  switch (node.type) {
    case 'paragraph':
    case 'heading':
      return renderInlineChildren(node.children);
    case 'code':
      return node.value;
    case 'list':
      return collectListItems(node).join('\n');
    case 'blockquote':
      return node.children.map(blockToMarkdown).join('\n');
    case 'table':
      return node.children.map((row) => tableRowToStrings(row).join(' | ')).join('\n');
    case 'thematicBreak':
      return '---';
    default:
      return '';
  }
};

const renderInlineChildren = (children: PhrasingContent[]): string =>
  children.map(renderInline).join('');

const renderInline = (node: PhrasingContent): string => {
  switch (node.type) {
    case 'text':
      return escapeInlineMarkdown(node.value);
    case 'emphasis':
      return `*${renderInlineChildren(node.children)}*`;
    case 'strong':
      return `**${renderInlineChildren(node.children)}**`;
    case 'delete':
      return `~~${renderInlineChildren(node.children)}~~`;
    case 'inlineCode':
      return renderInlineCode(node);
    case 'break':
      return '\n';
    case 'link':
      return renderLink(node);
    case 'image':
      return renderInlineImage(node);
    case 'html':
      return '';
    default:
      return 'children' in node && Array.isArray(node.children)
        ? renderInlineChildren(node.children as PhrasingContent[])
        : '';
  }
};

const renderInlineCode = (node: InlineCode): string => `\`${node.value.replaceAll('`', '\\`')}\``;

const renderLink = (node: Link): string => {
  const label = renderInlineChildren(node.children);
  const href = normalizeLinkHref(node.url);
  if (!href) return label;
  return `[${label}](${escapeLinkDestination(href)})`;
};

const renderInlineImage = (node: Image): string => {
  const label = node.alt || node.title || node.url;
  const href = normalizeLinkHref(node.url);
  if (!href) return escapeInlineMarkdown(label);
  return `[${escapeInlineMarkdown(label)}](${escapeLinkDestination(href)})`;
};

const tableRowToStrings = (row: TableRow): string[] => row.children.map(tableCellToString);

const tableCellToString = (cell: TableCell): string =>
  cell.children.map(inlineToPlainText).join('');

const normalizeRowLength = (row: string[], columnCount: number): string[] =>
  Array.from({ length: columnCount }, (_, index) => row[index] ?? '');

const defaultCellStyle = (builder: Builder): TableCellStyle => ({
  fontName: builder.fontName,
  alignment: 'left',
  verticalAlignment: 'middle',
  fontSize: builder.fontSize,
  lineHeight: builder.lineHeight,
  characterSpacing: 0,
  fontColor: builder.fontColor,
  backgroundColor: '#ffffff',
  borderColor: TABLE_BORDER_COLOR,
  borderWidth: resolveBoxSides(TABLE_CELL_BORDER_WIDTH),
  padding: resolveBoxSides(TABLE_CELL_PADDING),
});

const resolveBoxSides = (value: number | BoxSides): ResolvedBoxSides => {
  if (typeof value === 'number') return { top: value, right: value, bottom: value, left: value };
  const x = value.x ?? 0;
  const y = value.y ?? 0;
  return {
    top: value.top ?? y,
    right: value.right ?? x,
    bottom: value.bottom ?? y,
    left: value.left ?? x,
  };
};

const getBoxVerticalInset = (value: {
  borderWidth?: ResolvedBoxSides;
  padding?: ResolvedBoxSides;
}) =>
  (value.borderWidth?.top ?? 0) +
  (value.borderWidth?.bottom ?? 0) +
  (value.padding?.top ?? 0) +
  (value.padding?.bottom ?? 0);

const resolveAutoName = (builder: Builder, prefix: string): string => {
  let name = '';
  do {
    builder.nameCounters[prefix] = (builder.nameCounters[prefix] ?? 0) + 1;
    name = `${prefix}_${builder.nameCounters[prefix]}`;
  } while (builder.usedNames.has(name));
  builder.usedNames.add(name);
  return name;
};

const resolveName = (builder: Builder, baseName: string): string => {
  let name = baseName;
  let index = 0;
  while (builder.usedNames.has(name)) {
    index += 1;
    name = `${baseName}_${index}`;
  }
  builder.usedNames.add(name);
  return name;
};

const estimateTextHeight = (content: string, fontSize: number, lineHeight: number): number => {
  const lineCount = Math.max(1, content.split('\n').length);
  return Math.max(4, lineCount * pt2mm(fontSize * lineHeight) + 1);
};

const escapeInlineMarkdown = (value: string): string =>
  value.replace(MARKDOWN_ESCAPE_PATTERN, (match) => `\\${match}`);

const escapeLinkDestination = (href: string): string =>
  encodeURI(href).replace(/[\\()]/g, (match) => `\\${match}`);

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-|-$/g, '');

const toPlainText = (node: Heading): string =>
  node.children
    .map((child) => {
      if ('value' in child && typeof child.value === 'string') return child.value;
      if ('alt' in child && typeof child.alt === 'string') return child.alt;
      if ('children' in child && Array.isArray(child.children)) {
        return (child.children as PhrasingContent[])
          .map((grandchild) => toPlainInlineText(grandchild))
          .join('');
      }
      return '';
    })
    .join('');

const toPlainInlineText = (node: PhrasingContent): string => {
  if ('value' in node && typeof node.value === 'string') return node.value;
  if ('alt' in node && typeof node.alt === 'string') return node.alt;
  if ('children' in node && Array.isArray(node.children)) {
    return (node.children as PhrasingContent[]).map(toPlainInlineText).join('');
  }
  return '';
};

const inlineToPlainText = (node: PhrasingContent): string => {
  switch (node.type) {
    case 'text':
    case 'inlineCode':
      return node.value;
    case 'break':
      return '\n';
    case 'image':
      return node.alt || node.title || node.url;
    case 'link':
    case 'emphasis':
    case 'strong':
    case 'delete':
      return node.children.map(inlineToPlainText).join('');
    case 'html':
      return '';
    default:
      return 'children' in node && Array.isArray(node.children)
        ? (node.children as PhrasingContent[]).map(inlineToPlainText).join('')
        : '';
  }
};

const isBlockContent = (node: unknown): node is BlockContent =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  typeof node.type === 'string' &&
  RENDERABLE_BLOCK_TYPES.has(node.type);

const isList = (node: ListItem['children'][number]): node is List => node.type === 'list';
