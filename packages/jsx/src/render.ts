import { pt2mm, resolvePageSize } from '@pdfme/common';
import type { Schema, Template } from '@pdfme/common';
import type {
  CellStyle as SchemaCellStyle,
  ListSchema,
  TableSchema,
  TextSchema,
} from '@pdfme/schemas/types';
import { cloneElementWithChildren, isPdfJsxElement, isPdfJsxFragment } from './node.js';
import type {
  BoxProps,
  BoxSides,
  CellStyle,
  ListProps,
  PageProps,
  PdfJsxChild,
  PdfJsxElement,
  RenderOptions,
  RenderResult,
  RowProps,
  SpacerProps,
  StackProps,
  TableProps,
  TextProps,
} from './types.js';

type Rect = { x: number; y: number; width: number; height: number };

type RenderCtx = {
  schemas: Schema[];
  inputs: Record<string, string>;
  usedNames: Set<string>;
  nameCounters: Record<string, number>;
  defaultFont?: string;
};

const DEFAULT_FONT_SIZE = 10;
const DEFAULT_LINE_HEIGHT = 1;
const DEFAULT_CHARACTER_SPACING = 0;
const DEFAULT_FONT_COLOR = '#000000';
const DEFAULT_DYNAMIC_FONT_SIZE = {
  min: 4,
  max: 72,
  fit: 'vertical',
} as const satisfies NonNullable<TextSchema['dynamicFontSize']>;

export const renderToTemplate = (node: PdfJsxChild, options: RenderOptions = {}): RenderResult => {
  validatePageBreakPlacement(node);
  const expanded = expandPageBreaks(node);
  const pages = flattenChildren(expanded).filter(
    (child): child is PdfJsxElement<'page'> => isPdfJsxElement(child) && child.kind === 'page',
  );

  if (pages.length === 0) {
    throw new Error('@pdfme/jsx: renderToTemplate root must contain at least one <Page>.');
  }

  const firstPageProps = pages[0]?.props as PageProps;
  const firstMargin = resolveBoxSides(firstPageProps.margin);
  const pageSize = resolvePageSize(firstPageProps.size, firstPageProps.orientation);
  validateConsistentPageProps(pages, pageSize, firstMargin);
  const inputs: Record<string, string> = {};
  const usedNames = new Set<string>();
  const nameCounters: Record<string, number> = {};
  const pageSchemas: Schema[][] = [];

  for (const page of pages) {
    const props = page.props as PageProps;
    const margin = resolveBoxSides(props.margin);
    const frame = {
      x: margin.left,
      y: margin.top,
      width: pageSize.width - margin.left - margin.right,
      height: pageSize.height - margin.top - margin.bottom,
    };
    const ctx: RenderCtx = {
      schemas: [],
      inputs,
      usedNames,
      nameCounters,
      defaultFont: props.font,
    };
    layoutChildren(page.children, frame, 'stack', { gap: 0 }, ctx);
    pageSchemas.push(ctx.schemas);
  }

  const template: Template = {
    basePdf: options.basePdf ?? {
      width: pageSize.width,
      height: pageSize.height,
      padding: [firstMargin.top, firstMargin.right, firstMargin.bottom, firstMargin.left],
    },
    schemas: pageSchemas,
  };

  return { template, inputs: [inputs] };
};

const flattenChildren = (
  children: PdfJsxChild | PdfJsxChild[],
): (PdfJsxElement | string | number)[] => {
  if (children == null || children === false || children === true) return [];
  if (typeof children === 'string' || typeof children === 'number') return [children];
  if (Array.isArray(children)) return children.flatMap((child) => flattenChildren(child));
  if (isPdfJsxFragment(children)) return flattenChildren(children.children);
  if (isPdfJsxElement(children)) return [children];
  return [];
};

const childrenToString = (children: PdfJsxChild | PdfJsxChild[]): string =>
  flattenChildren(children)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') return String(child);
      return childrenToString(child.children);
    })
    .join('');

const splitChildrenByPageBreak = (children: PdfJsxChild | PdfJsxChild[]): PdfJsxChild[][] => {
  const segments: PdfJsxChild[][] = [[]];

  for (const child of flattenForSplitting(children)) {
    if (isPdfJsxElement(child) && child.kind === 'pagebreak') {
      segments.push([]);
      continue;
    }

    if (
      isPdfJsxElement(child) &&
      (child.kind === 'page' || child.kind === 'stack' || child.kind === 'box')
    ) {
      const childSegments = splitChildrenByPageBreak(child.children);
      if (childSegments.length === 1) {
        segments[segments.length - 1]?.push(child);
        continue;
      }

      segments[segments.length - 1]?.push(cloneElementWithChildren(child, childSegments[0] ?? []));
      for (let i = 1; i < childSegments.length; i += 1) {
        segments.push([cloneElementWithChildren(child, childSegments[i] ?? [])]);
      }
      continue;
    }

    segments[segments.length - 1]?.push(child);
  }

  return segments;
};

const flattenForSplitting = (children: PdfJsxChild | PdfJsxChild[]): PdfJsxChild[] => {
  if (children == null || children === false || children === true) return [];
  if (Array.isArray(children)) return children.flatMap((child) => flattenForSplitting(child));
  if (isPdfJsxFragment(children)) return flattenForSplitting(children.children);
  return [children];
};

const expandPageBreaks = (node: PdfJsxChild): PdfJsxChild[] =>
  splitChildrenByPageBreak(node).flat();

const layoutChildren = (
  children: PdfJsxChild | PdfJsxChild[],
  frame: Rect,
  mode: 'stack' | 'row',
  opts: { gap: number },
  ctx: RenderCtx,
): { width: number; height: number } => {
  const items = flattenChildren(children);
  const widths = mode === 'row' ? resolveRowWidths(items, frame.width, opts.gap) : undefined;
  let cursor = 0;
  let crossMax = 0;

  for (let i = 0; i < items.length; i += 1) {
    const child = items[i];
    const width = mode === 'row' ? (widths?.[i] ?? 0) : frame.width;
    const childFrame =
      mode === 'stack'
        ? { x: frame.x, y: frame.y + cursor, width, height: Math.max(0, frame.height - cursor) }
        : { x: frame.x + cursor, y: frame.y, width, height: frame.height };

    const size =
      typeof child === 'string' || typeof child === 'number'
        ? renderText({ children: String(child) }, childFrame, ctx)
        : renderElement(child, childFrame, mode, ctx);

    const advance = mode === 'stack' ? size.height : width;
    cursor += advance + (i < items.length - 1 ? opts.gap : 0);
    crossMax = Math.max(crossMax, mode === 'stack' ? size.width : size.height);
  }

  return mode === 'stack'
    ? { width: crossMax, height: cursor }
    : { width: cursor, height: crossMax };
};

const resolveRowWidths = (
  items: (PdfJsxElement | string | number)[],
  frameWidth: number,
  gap: number,
): number[] => {
  let fixedWidth = 0;
  let flexCount = 0;
  const widths = items.map((item) => {
    if (typeof item === 'string' || typeof item === 'number') {
      flexCount += 1;
      return undefined;
    }
    const width = (item.props as { width?: number }).width;
    if (typeof width === 'number') {
      fixedWidth += width;
      return width;
    }
    flexCount += 1;
    return undefined;
  });

  const remaining = Math.max(0, frameWidth - fixedWidth - Math.max(0, items.length - 1) * gap);
  const flexWidth = flexCount > 0 ? remaining / flexCount : 0;
  return widths.map((width) => width ?? flexWidth);
};

const renderElement = (
  element: PdfJsxElement,
  frame: Rect,
  parentMode: 'stack' | 'row',
  ctx: RenderCtx,
): { width: number; height: number } => {
  switch (element.kind) {
    case 'stack':
      return renderStack(element.props as StackProps, element.children, frame, ctx);
    case 'row':
      return renderRow(element.props as RowProps, element.children, frame, ctx);
    case 'box':
      return renderBox(element.props as BoxProps, element.children, frame, parentMode, ctx);
    case 'spacer':
      return renderSpacer(element.props as SpacerProps);
    case 'text':
      return renderText(
        { ...(element.props as TextProps), children: element.children },
        frame,
        ctx,
      );
    case 'list':
      return renderList(
        { ...(element.props as ListProps), children: element.children },
        frame,
        ctx,
      );
    case 'table':
      return renderTable(element.props as TableProps, frame, ctx);
    default:
      return { width: 0, height: 0 };
  }
};

const renderStack = (
  props: StackProps,
  children: PdfJsxChild[],
  frame: Rect,
  ctx: RenderCtx,
): { width: number; height: number } =>
  layoutChildren(
    children,
    { ...frame, width: props.width ?? frame.width },
    'stack',
    {
      gap: props.gap ?? 0,
    },
    ctx,
  );

const renderRow = (
  props: RowProps,
  children: PdfJsxChild[],
  frame: Rect,
  ctx: RenderCtx,
): { width: number; height: number } =>
  layoutChildren(
    children,
    { ...frame, width: props.width ?? frame.width, height: props.height ?? frame.height },
    'row',
    { gap: props.gap ?? 0 },
    ctx,
  );

const renderBox = (
  props: BoxProps,
  children: PdfJsxChild[],
  frame: Rect,
  _parentMode: 'stack' | 'row',
  ctx: RenderCtx,
): { width: number; height: number } => {
  const width = props.width ?? frame.width;
  const padding = resolveBoxSides(props.padding);
  const needsRect = Boolean(props.background || props.borderColor || props.borderWidth);
  const beforeCount = ctx.schemas.length;

  if (needsRect) {
    ctx.schemas.push({
      name: resolveName(ctx, 'box'),
      type: 'rectangle',
      position: { x: frame.x, y: frame.y },
      width,
      height: 0,
      rotate: props.rotate ?? 0,
      opacity: props.opacity ?? 1,
      readOnly: true,
      color: props.background ?? '',
      borderColor: props.borderColor ?? '',
      borderWidth: props.borderWidth ?? 0,
      radius: props.radius ?? 0,
    });
  }

  const innerFrame = {
    x: frame.x + padding.left,
    y: frame.y + padding.top,
    width: width - padding.left - padding.right,
    height: (props.height ?? frame.height) - padding.top - padding.bottom,
  };
  const childSize = layoutChildren(children, innerFrame, 'stack', { gap: 0 }, ctx);
  const height = props.height ?? childSize.height + padding.top + padding.bottom;

  if (needsRect) {
    ctx.schemas[beforeCount] = { ...ctx.schemas[beforeCount]!, height };
  }

  return { width, height };
};

const renderSpacer = (props: SpacerProps): { width: number; height: number } => ({
  width: props.width ?? 0,
  height: props.height ?? 0,
});

const renderText = (
  props: TextProps,
  frame: Rect,
  ctx: RenderCtx,
): { width: number; height: number } => {
  const fontSize = props.size ?? DEFAULT_FONT_SIZE;
  const lineHeight = props.lineHeight ?? DEFAULT_LINE_HEIGHT;
  const width = props.width ?? frame.width;
  const height = props.height ?? estimateTextHeight(fontSize, lineHeight);
  const value = childrenToString(props.children);
  const name = resolveName(ctx, 'text', props.name);
  const readOnly = props.readOnly ?? props.name == null;

  const schema: TextSchema = {
    name,
    type: 'text',
    content: value,
    position: { x: frame.x, y: frame.y },
    width,
    height,
    rotate: props.rotate ?? 0,
    opacity: props.opacity ?? 1,
    readOnly,
    required: props.required,
    alignment: props.align ?? 'left',
    verticalAlignment: props.valign ?? 'top',
    fontSize,
    fontName: props.font ?? ctx.defaultFont,
    lineHeight,
    characterSpacing: props.spacing ?? DEFAULT_CHARACTER_SPACING,
    fontColor: props.color ?? DEFAULT_FONT_COLOR,
    backgroundColor: props.background ?? '',
    textFormat: props.textFormat ?? 'plain',
    strikethrough: props.strikethrough ?? false,
    underline: props.underline ?? false,
  };

  if (props.borderColor) schema.borderColor = props.borderColor;
  if (props.borderWidth != null) schema.borderWidth = props.borderWidth;
  if (props.dynamicFontSize) {
    schema.dynamicFontSize = {
      min: props.dynamicFontSize.min ?? DEFAULT_DYNAMIC_FONT_SIZE.min,
      max: props.dynamicFontSize.max ?? DEFAULT_DYNAMIC_FONT_SIZE.max,
      fit: props.dynamicFontSize.fit ?? DEFAULT_DYNAMIC_FONT_SIZE.fit,
    };
  }
  if (!readOnly) ctx.inputs[name] = value;
  ctx.schemas.push(schema);

  return { width, height };
};

const renderList = (
  props: ListProps,
  frame: Rect,
  ctx: RenderCtx,
): { width: number; height: number } => {
  const fontSize = props.size ?? DEFAULT_FONT_SIZE;
  const lineHeight = props.lineHeight ?? DEFAULT_LINE_HEIGHT;
  const items = normalizeListItems(props);
  const serialized = JSON.stringify(items.map(serializeListItem));
  const width = props.width ?? frame.width;
  const height =
    props.height ??
    Math.max(1, items.length) * estimateTextHeight(fontSize, lineHeight) +
      Math.max(0, items.length - 1) * (props.itemSpacing ?? 1);
  const name = resolveName(ctx, 'list', props.name);
  const readOnly = props.readOnly ?? props.name == null;

  const schema: ListSchema = {
    name,
    type: 'list',
    content: serialized,
    position: { x: frame.x, y: frame.y },
    width,
    height,
    rotate: props.rotate ?? 0,
    opacity: props.opacity ?? 1,
    readOnly,
    required: props.required,
    alignment: props.align ?? 'left',
    verticalAlignment: 'top',
    fontSize,
    fontName: props.font ?? ctx.defaultFont,
    lineHeight,
    characterSpacing: props.spacing ?? DEFAULT_CHARACTER_SPACING,
    fontColor: props.color ?? DEFAULT_FONT_COLOR,
    backgroundColor: props.background ?? '',
    listStyle: props.listStyle ?? 'bullet',
    markerWidth: props.markerWidth ?? 6,
    markerGap: props.markerGap ?? 2,
    indentSize: props.indentSize ?? 6,
    itemSpacing: props.itemSpacing ?? 1,
  };

  if (!readOnly) ctx.inputs[name] = serialized;
  ctx.schemas.push(schema);

  return { width, height };
};

const renderTable = (
  props: TableProps,
  frame: Rect,
  ctx: RenderCtx,
): { width: number; height: number } => {
  const rows = (props.rows ?? props.data ?? []).map((row) => row.map(String));
  const width = props.width ?? frame.width;
  const showHead = props.showHead ?? true;
  const headerHeight = props.headerHeight ?? 9;
  const rowHeight = props.rowHeight ?? 6.5;
  const height =
    props.height ?? (showHead ? headerHeight : 0) + Math.max(1, rows.length) * rowHeight;
  const name = resolveName(ctx, 'table', props.name);
  const readOnly = props.readOnly ?? props.name == null;
  const value = JSON.stringify(rows);

  const schema: TableSchema = {
    name,
    type: 'table',
    content: value,
    position: { x: frame.x, y: frame.y },
    width,
    height,
    rotate: props.rotate ?? 0,
    opacity: props.opacity ?? 1,
    readOnly,
    required: props.required,
    showHead,
    repeatHead: props.repeatHead ?? false,
    head: props.head,
    headWidthPercentages: normalizeColumnWidths(props.widths, props.head.length),
    tableStyles: {
      borderColor: props.tableStyles?.borderColor ?? '#000000',
      borderWidth: props.tableStyles?.borderWidth ?? 0.3,
    },
    headStyles: {
      ...defaultCellStyle(props.font ?? ctx.defaultFont, props.fontSize),
      fontColor: '#ffffff',
      backgroundColor: '#2980ba',
      ...normalizeCellStyle(props.headStyles),
    },
    bodyStyles: {
      ...defaultCellStyle(props.font ?? ctx.defaultFont, props.fontSize),
      alternateBackgroundColor: '#f5f5f5',
      ...normalizeCellStyle(props.bodyStyles),
    },
    columnStyles: props.columnStyles ?? {},
  };

  if (!readOnly) ctx.inputs[name] = value;
  ctx.schemas.push(schema);

  return { width, height };
};

const normalizeListItems = (props: ListProps): { text: string; level: number }[] => {
  if (props.items) {
    return props.items.map((item) =>
      typeof item === 'string'
        ? { text: item, level: 0 }
        : { text: item.text, level: item.level ?? 0 },
    );
  }
  return childrenToString(props.children)
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((text) => ({ text, level: 0 }));
};

const serializeListItem = (item: { text: string; level: number }) =>
  `${'\t'.repeat(Math.max(0, item.level))}${item.text}`;

const normalizeColumnWidths = (widths: number[] | undefined, columnCount: number): number[] => {
  if (widths && widths.length > 0) return widths;
  if (columnCount <= 0) return [];
  return Array.from({ length: columnCount }, () => 100 / columnCount);
};

const defaultCellStyle = (fontName: string | undefined, fontSize = 10): SchemaCellStyle => ({
  fontName,
  alignment: 'left',
  verticalAlignment: 'middle',
  fontSize,
  lineHeight: 1,
  characterSpacing: 0,
  fontColor: '#000000',
  backgroundColor: '#ffffff',
  borderColor: '#000000',
  borderWidth: { top: 0, right: 0, bottom: 0, left: 0 },
  padding: { top: 5, right: 5, bottom: 5, left: 5 },
});

const normalizeCellStyle = (
  style: CellStyle | undefined,
): Partial<SchemaCellStyle & { alternateBackgroundColor: string }> => {
  if (!style) return {};
  const { borderWidth, padding, ...rest } = style;
  return {
    ...rest,
    ...(borderWidth != null ? { borderWidth: resolveBoxSides(borderWidth) } : {}),
    ...(padding != null ? { padding: resolveBoxSides(padding) } : {}),
  };
};

const resolveBoxSides = (value?: number | BoxSides) => {
  if (value == null) return { top: 0, right: 0, bottom: 0, left: 0 };
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

const resolveName = (ctx: RenderCtx, prefix: string, userName?: string): string => {
  if (userName) {
    if (ctx.usedNames.has(userName)) {
      throw new Error(`@pdfme/jsx: duplicate schema name "${userName}"`);
    }
    ctx.usedNames.add(userName);
    return userName;
  }

  let name = '';
  do {
    ctx.nameCounters[prefix] = (ctx.nameCounters[prefix] ?? 0) + 1;
    name = `${prefix}_${ctx.nameCounters[prefix]}`;
  } while (ctx.usedNames.has(name));
  ctx.usedNames.add(name);
  return name;
};

const estimateTextHeight = (fontSize: number, lineHeight: number) =>
  Math.max(4, pt2mm(fontSize * lineHeight));

const validateConsistentPageProps = (
  pages: PdfJsxElement<'page'>[],
  firstPageSize: { width: number; height: number },
  firstMargin: ReturnType<typeof resolveBoxSides>,
) => {
  for (let i = 1; i < pages.length; i += 1) {
    const props = pages[i]?.props as PageProps;
    const pageSize = resolvePageSize(props.size, props.orientation);
    const margin = resolveBoxSides(props.margin);

    if (!isSameSize(pageSize, firstPageSize) || !isSameBoxSides(margin, firstMargin)) {
      throw new Error(
        '@pdfme/jsx: all <Page> nodes must use the same size, orientation, and margin. pdfme templates have one blank basePdf size and padding.',
      );
    }
  }
};

const isSameSize = (
  first: { width: number; height: number },
  second: { width: number; height: number },
) => first.width === second.width && first.height === second.height;

const isSameBoxSides = (
  first: ReturnType<typeof resolveBoxSides>,
  second: ReturnType<typeof resolveBoxSides>,
) =>
  first.top === second.top &&
  first.right === second.right &&
  first.bottom === second.bottom &&
  first.left === second.left;

const PAGE_BREAK_PARENT_KINDS = new Set(['page', 'stack', 'box']);

const validatePageBreakPlacement = (
  node: PdfJsxChild | PdfJsxChild[],
  parentKind: string | undefined = undefined,
  canBreak = false,
) => {
  for (const child of flattenForSplitting(node)) {
    if (!isPdfJsxElement(child)) continue;

    if (child.kind === 'pagebreak') {
      if (!canBreak || !parentKind || !PAGE_BREAK_PARENT_KINDS.has(parentKind)) {
        throw new Error(
          '@pdfme/jsx: <PageBreak> can only be used inside <Page>, <Stack>, or <Box>.',
        );
      }
      continue;
    }

    const childCanBreak =
      child.kind === 'page' ? true : canBreak && PAGE_BREAK_PARENT_KINDS.has(child.kind);
    validatePageBreakPlacement(child.children, child.kind, childCanBreak);
  }
};
