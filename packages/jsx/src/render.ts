import { getDefaultFont, isBlankPdf, pt2mm, resolvePageSize } from '@pdfme/common';
import type { Font, Schema, Template } from '@pdfme/common';
import type {
  CellStyle as SchemaCellStyle,
  ImageSchema,
  LineSchema,
  ListSchema,
  MultiVariableTextSchema,
  ShapeSchema,
  SVGSchema,
  TableSchema,
  TextSchema,
} from '@pdfme/schemas/types';
import {
  escapeInlineMarkdown,
  getVariableNames,
  measureTextHeight,
  visitVariables,
} from '@pdfme/schemas/utils';
import { cloneElementWithChildren, isPdfJsxElement, isPdfJsxFragment } from './node.js';
import type {
  AbsoluteProps,
  BoxProps,
  BoxSides,
  CellStyle,
  DocumentProps,
  EllipseProps,
  ImageProps,
  LineProps,
  LayoutAlignItems,
  LayoutJustifyContent,
  ListProps,
  MultiVariableTextProps,
  MultiVariableTextValues,
  PageProps,
  PdfJsxChild,
  PdfJsxElement,
  RectangleProps,
  RenderOptions,
  RenderResult,
  RowProps,
  SpacerProps,
  StackProps,
  StaticPlacement,
  StaticProps,
  SvgProps,
  TableProps,
  TextProps,
} from './types.js';

type Rect = { x: number; y: number; width: number; height: number };
type Box = ReturnType<typeof resolveBoxSides>;
type LayoutMode = 'stack' | 'row';
type LayoutItem = {
  schemaStart: number;
  schemaEnd: number;
  outerHeight: number;
};
type StaticBlocks = {
  footer: PdfJsxChild[];
  header: PdfJsxChild[];
  staticBottom: PdfJsxChild[];
  staticTop: PdfJsxChild[];
};
type RenderRoot = {
  children: PdfJsxChild[];
  documentProps?: DocumentProps;
  hasDocument: boolean;
};

type RenderCtx = {
  schemas: Schema[];
  inputs: Record<string, string>;
  usedNames: Set<string>;
  nameCounters: Record<string, number>;
  defaultFont?: string;
  font: Font;
  _cache: Map<string | number, unknown>;
};

const DEFAULT_FONT_SIZE = 10;
const DEFAULT_LINE_HEIGHT = 1;
const DEFAULT_CHARACTER_SPACING = 0;
const DEFAULT_FONT_COLOR = '#000000';
const DEFAULT_VISUAL_HEIGHT = 40;
const DEFAULT_LINE_THICKNESS = 0.5;
const DEFAULT_LINE_COLOR = '#000000';
const DEFAULT_SHAPE_BORDER_COLOR = '#000000';
const DEFAULT_DYNAMIC_FONT_SIZE = {
  min: 4,
  max: 72,
  fit: 'vertical',
} as const satisfies NonNullable<TextSchema['dynamicFontSize']>;

export const renderToTemplate = async (
  node: PdfJsxChild,
  options: RenderOptions = {},
): Promise<RenderResult> => {
  validatePageBreakPlacement(node);
  const root = resolveRenderRoot(node);
  validateAbsolutePlacement(root.children);
  validateStaticPlacement(root.children, root.hasDocument);
  const { pages: rawPages, blocks: staticBlocks } = extractDocumentChildren(root);
  const pages = rawPages.map((page) => applyDocumentPageDefaults(page, root.documentProps));

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
  const font = options.font ?? getDefaultFont();
  const _cache = new Map<string | number, unknown>();
  const pageSchemas: Schema[][] = [];
  const staticSchemas: Schema[] = [];
  const hasStaticChildren = hasStaticBlocks(staticBlocks);

  if (hasStaticChildren && options.basePdf != null && !isBlankPdf(options.basePdf)) {
    throw new Error(
      '@pdfme/jsx: <Header>, <Footer>, and <Static> are supported only with a blank basePdf.',
    );
  }

  if (hasStaticChildren) {
    await layoutStaticBlocks({
      blocks: staticBlocks,
      margin: firstMargin,
      pageSize,
      staticSchemas,
      inputs,
      usedNames,
      nameCounters,
      defaultFont: firstPageProps.font,
      font,
      _cache,
    });
  }

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
      font,
      _cache,
    };
    await layoutChildren(
      page.children,
      frame,
      'stack',
      { gap: 0, alignItems: 'stretch', justifyContent: 'start' },
      ctx,
    );
    pageSchemas.push(ctx.schemas);
  }

  const basePdf = options.basePdf ?? {
    width: pageSize.width,
    height: pageSize.height,
    padding: [firstMargin.top, firstMargin.right, firstMargin.bottom, firstMargin.left],
  };

  const template: Template = {
    basePdf:
      staticSchemas.length > 0 && isBlankPdf(basePdf)
        ? {
            ...basePdf,
            staticSchema: [...(basePdf.staticSchema ?? []), ...staticSchemas],
          }
        : basePdf,
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

const STATIC_DIRECT_KINDS = new Set(['header', 'footer', 'static']);

const createEmptyStaticBlocks = (): StaticBlocks => ({
  footer: [],
  header: [],
  staticBottom: [],
  staticTop: [],
});

const resolveRenderRoot = (node: PdfJsxChild): RenderRoot => {
  const topLevelChildren = flattenChildren(node);
  const documents = topLevelChildren.filter(
    (child): child is PdfJsxElement<'document'> =>
      isPdfJsxElement(child) && child.kind === 'document',
  );

  if (documents.length === 0) {
    return { children: expandPageBreaks(node), hasDocument: false };
  }

  if (documents.length > 1) {
    throw new Error('@pdfme/jsx: only one <Document> root is supported.');
  }

  if (topLevelChildren.some((child) => child !== documents[0])) {
    throw new Error('@pdfme/jsx: <Document> must be the only root element.');
  }

  const document = documents[0];
  return {
    children: expandPageBreaks(document.children),
    documentProps: document.props as DocumentProps,
    hasDocument: true,
  };
};

const extractDocumentChildren = (
  root: RenderRoot,
): { pages: PdfJsxElement<'page'>[]; blocks: StaticBlocks } => {
  const blocks = createEmptyStaticBlocks();
  const pages: PdfJsxElement<'page'>[] = [];

  for (const child of flattenChildren(root.children)) {
    if (!isPdfJsxElement(child)) continue;

    if (child.kind === 'page') {
      pages.push(child as PdfJsxElement<'page'>);
      continue;
    }

    if (!root.hasDocument || !STATIC_DIRECT_KINDS.has(child.kind)) continue;

    if (child.kind === 'header') {
      blocks.header.push(...child.children);
    } else if (child.kind === 'footer') {
      blocks.footer.push(...child.children);
    } else if (child.kind === 'static') {
      const placement = getStaticPlacement(child as PdfJsxElement<'static'>);
      blocks[placement === 'top' ? 'staticTop' : 'staticBottom'].push(...child.children);
    }
  }

  return { pages, blocks };
};

const applyDocumentPageDefaults = (
  page: PdfJsxElement<'page'>,
  documentProps: DocumentProps | undefined,
): PdfJsxElement<'page'> => {
  if (!documentProps) return page;
  const { children: _children, ...props } = documentProps;
  return {
    ...page,
    props: {
      ...props,
      ...page.props,
    },
  };
};

const hasStaticBlocks = (blocks: StaticBlocks) =>
  blocks.header.length > 0 ||
  blocks.footer.length > 0 ||
  blocks.staticTop.length > 0 ||
  blocks.staticBottom.length > 0;

const layoutStaticBlocks = async (arg: {
  blocks: StaticBlocks;
  margin: Box;
  pageSize: { width: number; height: number };
  staticSchemas: Schema[];
  inputs: Record<string, string>;
  usedNames: Set<string>;
  nameCounters: Record<string, number>;
  defaultFont?: string;
  font: Font;
  _cache: Map<string | number, unknown>;
}) => {
  const contentWidth = Math.max(0, arg.pageSize.width - arg.margin.left - arg.margin.right);
  const blockFrames: Array<{ children: PdfJsxChild[]; frame: Rect; placement?: StaticPlacement }> =
    [
      {
        children: arg.blocks.staticTop,
        frame: { x: 0, y: 0, width: arg.pageSize.width, height: arg.pageSize.height },
      },
      {
        children: arg.blocks.header,
        frame: {
          x: arg.margin.left,
          y: 0,
          width: contentWidth,
          height: arg.margin.top,
        },
      },
      {
        children: arg.blocks.footer,
        frame: {
          x: arg.margin.left,
          y: arg.pageSize.height - arg.margin.bottom,
          width: contentWidth,
          height: arg.margin.bottom,
        },
      },
      {
        children: arg.blocks.staticBottom,
        frame: { x: 0, y: 0, width: arg.pageSize.width, height: arg.pageSize.height },
        placement: 'bottom',
      },
    ];

  for (const { children, frame, placement } of blockFrames) {
    if (children.length === 0) continue;

    const schemas: Schema[] = [];
    const ctx: RenderCtx = {
      schemas,
      inputs: arg.inputs,
      usedNames: arg.usedNames,
      nameCounters: arg.nameCounters,
      defaultFont: arg.defaultFont,
      font: arg.font,
      _cache: arg._cache,
    };
    const size = await layoutChildren(
      children,
      frame,
      'stack',
      {
        gap: 0,
        alignItems: 'stretch',
        justifyContent: 'start',
      },
      ctx,
    );

    if (placement === 'bottom') {
      shiftSchemas(schemas, 0, schemas.length, 0, Math.max(0, frame.height - size.height));
    }
    arg.staticSchemas.push(...schemas);
  }
};

const layoutChildren = async (
  children: PdfJsxChild | PdfJsxChild[],
  frame: Rect,
  mode: LayoutMode,
  opts: {
    gap: number;
    alignItems: LayoutAlignItems;
    justifyContent: LayoutJustifyContent;
    mainSize?: number;
    crossSize?: number;
  },
  ctx: RenderCtx,
): Promise<{ width: number; height: number }> => {
  const items = flattenChildren(children);
  const flowItems = items.filter((item) => !isAbsoluteElement(item));
  const widths = mode === 'row' ? resolveRowWidths(flowItems, frame.width, opts.gap) : undefined;
  let cursor = 0;
  let crossMax = 0;
  let flowIndex = 0;
  const layoutItems: LayoutItem[] = [];

  for (let i = 0; i < items.length; i += 1) {
    const child = items[i];
    if (isAbsoluteElement(child)) {
      await renderAbsolute(child.props as AbsoluteProps, child.children, frame, ctx);
      continue;
    }

    const margin = getChildMargin(child);
    const width =
      mode === 'row'
        ? (widths?.[flowIndex] ?? 0)
        : resolveStackChildWidth(child, frame.width, margin);
    const childFrame =
      mode === 'stack'
        ? { x: frame.x, y: frame.y + cursor, width, height: Math.max(0, frame.height - cursor) }
        : { x: frame.x + cursor, y: frame.y, width, height: frame.height };
    childFrame.x += margin.left;
    childFrame.y += margin.top;
    childFrame.height = Math.max(0, childFrame.height - margin.top - margin.bottom);

    const schemaStart = ctx.schemas.length;
    const size =
      typeof child === 'string' || typeof child === 'number'
        ? await renderText({ children: String(child) }, childFrame, ctx)
        : await renderElement(child, childFrame, mode, ctx);
    const schemaEnd = ctx.schemas.length;

    const mainSize =
      mode === 'stack'
        ? margin.top + size.height + margin.bottom
        : margin.left + width + margin.right;
    const outerHeight = margin.top + size.height + margin.bottom;

    layoutItems.push({ schemaStart, schemaEnd, outerHeight });

    if (mode === 'stack') {
      const outerWidth = margin.left + size.width + margin.right;
      const dx = resolveAlignOffset(frame.width, outerWidth, opts.alignItems);
      if (dx !== 0) shiftSchemas(ctx.schemas, schemaStart, schemaEnd, dx, 0);
    }

    // flowIndex tracks the flow-only list so Absolute siblings do not affect gap accounting.
    cursor += mainSize + (flowIndex < flowItems.length - 1 ? opts.gap : 0);
    flowIndex += 1;
    crossMax = Math.max(
      crossMax,
      mode === 'stack'
        ? margin.left + size.width + margin.right
        : margin.top + size.height + margin.bottom,
    );
  }

  const contentMainSize = cursor;
  const containerMainSize = opts.mainSize ?? contentMainSize;
  applyJustifyContent(ctx.schemas, layoutItems, mode, contentMainSize, containerMainSize, opts);

  if (mode === 'row') {
    const rowHeight = opts.crossSize ?? crossMax;
    for (const item of layoutItems) {
      const dy = resolveAlignOffset(rowHeight, item.outerHeight, opts.alignItems);
      if (dy !== 0) shiftSchemas(ctx.schemas, item.schemaStart, item.schemaEnd, 0, dy);
    }
    return { width: containerMainSize, height: rowHeight };
  }

  return { width: crossMax, height: containerMainSize };
};

const resolveRowWidths = (
  items: (PdfJsxElement | string | number)[],
  frameWidth: number,
  gap: number,
): number[] => {
  let usedWidth = 0;
  let totalGrow = 0;
  const parts = items.map((item) => {
    const margin = getChildMargin(item);
    const width = getChildWidth(item);
    const flexGrow = getChildFlexGrow(item);
    const grow = flexGrow ?? (width == null ? 1 : 0);
    const basis = width ?? 0;
    usedWidth += basis + margin.left + margin.right;
    totalGrow += grow;
    return { basis, grow };
  });

  const remaining = Math.max(0, frameWidth - usedWidth - Math.max(0, items.length - 1) * gap);
  const flexUnit = totalGrow > 0 ? remaining / totalGrow : 0;
  return parts.map(({ basis, grow }) => basis + grow * flexUnit);
};

const getChildMargin = (child: PdfJsxElement | string | number): Box => {
  if (typeof child === 'string' || typeof child === 'number') return resolveBoxSides();
  return resolveBoxSides((child.props as { margin?: number | BoxSides }).margin);
};

const getChildWidth = (child: PdfJsxElement | string | number): number | undefined => {
  if (typeof child === 'string' || typeof child === 'number') return undefined;
  const width = (child.props as { width?: number }).width;
  return typeof width === 'number' ? width : undefined;
};

const getChildFlexGrow = (child: PdfJsxElement | string | number): number | undefined => {
  if (typeof child === 'string' || typeof child === 'number') return undefined;
  const props = child.props as { flex?: number; flexGrow?: number };
  const flexGrow = props.flexGrow ?? props.flex;
  return typeof flexGrow === 'number' ? Math.max(0, flexGrow) : undefined;
};

const isAbsoluteElement = (
  child: PdfJsxElement | string | number,
): child is PdfJsxElement<'absolute'> => isPdfJsxElement(child) && child.kind === 'absolute';

const getStaticPlacement = (element: PdfJsxElement<'static'>): StaticPlacement => {
  const placement = (element.props as StaticProps).placement ?? 'top';
  if (placement !== 'top' && placement !== 'bottom') {
    throw new Error('@pdfme/jsx: <Static> placement must be "top" or "bottom".');
  }
  return placement;
};

const resolveStackChildWidth = (
  child: PdfJsxElement | string | number,
  frameWidth: number,
  margin: Box,
) => {
  const width = getChildWidth(child);
  if (width != null) return width;
  return Math.max(0, frameWidth - margin.left - margin.right);
};

const applyJustifyContent = (
  schemas: Schema[],
  items: LayoutItem[],
  mode: LayoutMode,
  contentMainSize: number,
  containerMainSize: number,
  opts: { justifyContent: LayoutJustifyContent },
) => {
  // Overflowing content has no extra main-axis space to distribute.
  const extraSpace = Math.max(0, containerMainSize - contentMainSize);
  if (extraSpace === 0 || opts.justifyContent === 'start') return;

  const extraGap =
    opts.justifyContent === 'space-between' && items.length > 1
      ? extraSpace / (items.length - 1)
      : 0;
  const startOffset =
    opts.justifyContent === 'center'
      ? extraSpace / 2
      : opts.justifyContent === 'end'
        ? extraSpace
        : 0;

  let runningExtraGap = 0;
  for (const item of items) {
    const offset = startOffset + runningExtraGap;
    if (offset !== 0) {
      shiftSchemas(
        schemas,
        item.schemaStart,
        item.schemaEnd,
        mode === 'row' ? offset : 0,
        mode === 'stack' ? offset : 0,
      );
    }
    runningExtraGap += extraGap;
  }
};

const resolveAlignOffset = (
  containerSize: number,
  itemSize: number,
  alignItems: LayoutAlignItems,
) => {
  // Overflowing children stay pinned to start instead of being pulled outside the frame.
  if (alignItems === 'center') return Math.max(0, (containerSize - itemSize) / 2);
  if (alignItems === 'end') return Math.max(0, containerSize - itemSize);
  return 0;
};

const shiftSchemas = (schemas: Schema[], start: number, end: number, dx: number, dy: number) => {
  for (let i = start; i < end; i += 1) {
    const schema = schemas[i];
    if (!schema) continue;
    schema.position = {
      x: schema.position.x + dx,
      y: schema.position.y + dy,
    };
  }
};

const renderElement = async (
  element: PdfJsxElement,
  frame: Rect,
  parentMode: LayoutMode,
  ctx: RenderCtx,
): Promise<{ width: number; height: number }> => {
  const shouldUseResolvedRowWidth = parentMode === 'row' && getChildFlexGrow(element) != null;
  const props = shouldUseResolvedRowWidth
    ? { ...element.props, width: frame.width }
    : element.props;

  switch (element.kind) {
    case 'stack':
      return renderStack(props as StackProps, element.children, frame, ctx);
    case 'row':
      return renderRow(props as RowProps, element.children, frame, ctx);
    case 'box':
      return renderBox(props as BoxProps, element.children, frame, parentMode, ctx);
    case 'spacer':
      return Promise.resolve(renderSpacer(props as SpacerProps));
    case 'text':
      return renderText({ ...(props as TextProps), children: element.children }, frame, ctx);
    case 'multiVariableText':
      return renderMultiVariableText(
        { ...(props as MultiVariableTextProps), children: element.children },
        frame,
        ctx,
      );
    case 'image':
      return renderImage(props as ImageProps, frame, ctx);
    case 'svg':
      return renderSvg({ ...(props as SvgProps), children: element.children }, frame, ctx);
    case 'rectangle':
      return renderShape('rectangle', props as RectangleProps, frame, ctx);
    case 'ellipse':
      return renderShape('ellipse', props as EllipseProps, frame, ctx);
    case 'line':
      return renderLine(props as LineProps, frame, ctx);
    case 'list':
      return renderList({ ...(props as ListProps), children: element.children }, frame, ctx);
    case 'table':
      return renderTable(props as TableProps, frame, ctx);
    case 'document':
      throw new Error('@pdfme/jsx: <Document> must be the root element.');
    case 'header':
    case 'footer':
    case 'static':
      throw new Error(
        '@pdfme/jsx: <Header>, <Footer>, and <Static> can only be used as direct children of <Document>.',
      );
    case 'absolute':
      return renderAbsolute(props as AbsoluteProps, element.children, frame, ctx);
    default:
      return { width: 0, height: 0 };
  }
};

const renderAbsolute = async (
  props: AbsoluteProps,
  children: PdfJsxChild[],
  frame: Rect,
  ctx: RenderCtx,
): Promise<{ width: number; height: number }> => {
  const x = props.x ?? 0;
  const y = props.y ?? 0;
  const childFrame = {
    x: frame.x + x,
    y: frame.y + y,
    width: props.width ?? Math.max(0, frame.width - x),
    height: props.height ?? Math.max(0, frame.height - y),
  };

  await layoutChildren(
    children,
    childFrame,
    'stack',
    { gap: 0, alignItems: 'stretch', justifyContent: 'start' },
    ctx,
  );
  return { width: 0, height: 0 };
};

const renderStack = (
  props: StackProps,
  children: PdfJsxChild[],
  frame: Rect,
  ctx: RenderCtx,
): Promise<{ width: number; height: number }> =>
  layoutChildren(
    children,
    { ...frame, width: props.width ?? frame.width, height: props.height ?? frame.height },
    'stack',
    {
      gap: props.gap ?? 0,
      alignItems: props.alignItems ?? 'stretch',
      justifyContent: props.justifyContent ?? 'start',
      mainSize: props.height,
    },
    ctx,
  );

const renderRow = (
  props: RowProps,
  children: PdfJsxChild[],
  frame: Rect,
  ctx: RenderCtx,
): Promise<{ width: number; height: number }> =>
  layoutChildren(
    children,
    { ...frame, width: props.width ?? frame.width, height: props.height ?? frame.height },
    'row',
    {
      gap: props.gap ?? 0,
      alignItems: props.alignItems ?? 'start',
      justifyContent: props.justifyContent ?? 'start',
      mainSize: props.width,
      crossSize: props.height,
    },
    ctx,
  );

const renderBox = async (
  props: BoxProps,
  children: PdfJsxChild[],
  frame: Rect,
  _parentMode: LayoutMode,
  ctx: RenderCtx,
): Promise<{ width: number; height: number }> => {
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
  const childSize = await layoutChildren(
    children,
    innerFrame,
    'stack',
    { gap: 0, alignItems: 'stretch', justifyContent: 'start' },
    ctx,
  );
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

const renderText = async (
  props: TextProps,
  frame: Rect,
  ctx: RenderCtx,
): Promise<{ width: number; height: number }> => {
  const fontSize = props.size ?? DEFAULT_FONT_SIZE;
  const lineHeight = props.lineHeight ?? DEFAULT_LINE_HEIGHT;
  const width = props.width ?? frame.width;
  const value = childrenToString(props.children);
  const readOnly = props.readOnly ?? props.name == null;
  const textFormat = props.textFormat ?? 'plain';

  if (!readOnly && textFormat === 'inline-markdown') {
    throw new Error(
      '@pdfme/jsx: editable <Text> does not support textFormat="inline-markdown". Use read-only <Text> or <MultiVariableText>.',
    );
  }
  const name = resolveName(ctx, 'text', props.name);

  const schema: TextSchema = {
    name,
    type: 'text',
    content: value,
    position: { x: frame.x, y: frame.y },
    width,
    height: props.height ?? 0,
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
    textFormat,
    overflow: props.overflow,
    strikethrough: props.strikethrough ?? false,
    underline: props.underline ?? false,
  };

  if (props.borderColor) schema.borderColor = props.borderColor;
  if (props.borderWidth != null) schema.borderWidth = resolveBoxSides(props.borderWidth);
  if (props.padding != null) schema.padding = resolveBoxSides(props.padding);
  if (props.dynamicFontSize) {
    schema.dynamicFontSize = {
      min: props.dynamicFontSize.min ?? DEFAULT_DYNAMIC_FONT_SIZE.min,
      max: props.dynamicFontSize.max ?? DEFAULT_DYNAMIC_FONT_SIZE.max,
      fit: props.dynamicFontSize.fit ?? DEFAULT_DYNAMIC_FONT_SIZE.fit,
    };
  }
  if (props.height == null) {
    schema.height = await measureTextHeight({ value, schema, font: ctx.font, _cache: ctx._cache });
  }
  if (!readOnly) ctx.inputs[name] = value;
  ctx.schemas.push(schema);

  return { width, height: schema.height };
};

const renderMultiVariableText = async (
  props: MultiVariableTextProps,
  frame: Rect,
  ctx: RenderCtx,
): Promise<{ width: number; height: number }> => {
  const fontSize = props.size ?? DEFAULT_FONT_SIZE;
  const lineHeight = props.lineHeight ?? DEFAULT_LINE_HEIGHT;
  const width = props.width ?? frame.width;
  const templateText = props.text ?? childrenToString(props.children);
  const values = normalizeMultiVariableTextValues(props.values);
  const variables = resolveMultiVariableTextVariables(templateText, props.variables, values);
  const name = resolveName(ctx, 'multiVariableText', props.name);
  const readOnly = props.readOnly ?? props.name == null;
  const textFormat = props.textFormat ?? 'plain';
  const content = readOnly
    ? substituteMultiVariableText(templateText, values, textFormat === 'inline-markdown')
    : JSON.stringify(values);

  const schema: MultiVariableTextSchema = {
    name,
    type: 'multiVariableText',
    content,
    position: { x: frame.x, y: frame.y },
    width,
    height: props.height ?? 0,
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
    textFormat,
    overflow: props.overflow,
    strikethrough: props.strikethrough ?? false,
    underline: props.underline ?? false,
    text: templateText,
    variables,
  };

  if (props.borderColor) schema.borderColor = props.borderColor;
  if (props.borderWidth != null) schema.borderWidth = resolveBoxSides(props.borderWidth);
  if (props.padding != null) schema.padding = resolveBoxSides(props.padding);
  if (props.dynamicFontSize) {
    schema.dynamicFontSize = {
      min: props.dynamicFontSize.min ?? DEFAULT_DYNAMIC_FONT_SIZE.min,
      max: props.dynamicFontSize.max ?? DEFAULT_DYNAMIC_FONT_SIZE.max,
      fit: props.dynamicFontSize.fit ?? DEFAULT_DYNAMIC_FONT_SIZE.fit,
    };
  }
  if (props.height == null) {
    const measureValue = readOnly
      ? content
      : substituteMultiVariableText(templateText, values, textFormat === 'inline-markdown');
    schema.height = await measureTextHeight({
      value: measureValue,
      schema,
      font: ctx.font,
      _cache: ctx._cache,
    });
  }
  if (!readOnly) ctx.inputs[name] = content;
  ctx.schemas.push(schema);

  return { width, height: schema.height };
};

const renderImage = (
  props: ImageProps,
  frame: Rect,
  ctx: RenderCtx,
): { width: number; height: number } => {
  const width = props.width ?? frame.width;
  const height = props.height ?? DEFAULT_VISUAL_HEIGHT;
  const name = resolveName(ctx, 'image', props.name);
  const readOnly = props.readOnly ?? props.name == null;
  const content = props.src ?? '';

  const schema: ImageSchema = {
    name,
    type: 'image',
    content,
    position: { x: frame.x, y: frame.y },
    width,
    height,
    rotate: props.rotate ?? 0,
    opacity: props.opacity ?? 1,
    readOnly,
    required: props.required,
  };

  if (!readOnly) ctx.inputs[name] = content;
  ctx.schemas.push(schema);

  return { width, height };
};

const renderSvg = (
  props: SvgProps,
  frame: Rect,
  ctx: RenderCtx,
): { width: number; height: number } => {
  const width = props.width ?? frame.width;
  const height = props.height ?? DEFAULT_VISUAL_HEIGHT;
  const name = resolveName(ctx, 'svg', props.name);
  const readOnly = props.readOnly ?? props.name == null;
  const content = props.svg ?? childrenToString(props.children);

  const schema: SVGSchema = {
    name,
    type: 'svg',
    content,
    position: { x: frame.x, y: frame.y },
    width,
    height,
    rotate: props.rotate ?? 0,
    opacity: props.opacity ?? 1,
    readOnly,
    required: props.required,
  };

  if (!readOnly) ctx.inputs[name] = content;
  ctx.schemas.push(schema);

  return { width, height };
};

const renderShape = (
  type: ShapeSchema['type'],
  props: RectangleProps | EllipseProps,
  frame: Rect,
  ctx: RenderCtx,
): { width: number; height: number } => {
  const width = props.width ?? frame.width;
  const height = props.height ?? DEFAULT_VISUAL_HEIGHT;
  const fill = props.fill ?? '';
  const borderWidth = props.borderWidth ?? (props.borderColor || !fill ? 1 : 0);

  const schema: ShapeSchema = {
    name: resolveName(ctx, type, props.name),
    type,
    position: { x: frame.x, y: frame.y },
    width,
    height,
    rotate: props.rotate ?? 0,
    opacity: props.opacity ?? 1,
    readOnly: true,
    borderWidth,
    borderColor: props.borderColor ?? (borderWidth > 0 ? DEFAULT_SHAPE_BORDER_COLOR : ''),
    color: fill,
    radius: type === 'rectangle' ? ((props as RectangleProps).radius ?? 0) : 0,
  };

  ctx.schemas.push(schema);

  return { width, height };
};

const renderLine = (
  props: LineProps,
  frame: Rect,
  ctx: RenderCtx,
): { width: number; height: number } => {
  const width = props.width ?? frame.width;
  const height = props.height ?? DEFAULT_LINE_THICKNESS;

  const schema: LineSchema = {
    name: resolveName(ctx, 'line', props.name),
    type: 'line',
    position: { x: frame.x, y: frame.y },
    width,
    height,
    rotate: props.rotate ?? 0,
    opacity: props.opacity ?? 1,
    readOnly: true,
    color: props.color ?? DEFAULT_LINE_COLOR,
  };

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
    headWidthPercentages: normalizeColumnWeights(props.columnWeights, props.head.length),
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

const normalizeMultiVariableTextValues = (
  values: MultiVariableTextValues | undefined,
): Record<string, string> => {
  const normalized: Record<string, string> = {};
  Object.entries(values ?? {}).forEach(([key, value]) => {
    normalized[key] = value == null ? '' : String(value);
  });
  return normalized;
};

const resolveMultiVariableTextVariables = (
  templateText: string,
  variables: string[] | undefined,
  values: Record<string, string>,
) => {
  const result: string[] = [];
  const seen = new Set<string>();
  const add = (name: string) => {
    if (!seen.has(name)) {
      seen.add(name);
      result.push(name);
    }
  };

  variables?.forEach(add);
  getVariableNames(templateText).forEach(add);
  Object.keys(values).forEach(add);
  return result;
};

const substituteMultiVariableText = (
  templateText: string,
  values: Record<string, string>,
  escapeMarkdown: boolean,
) => {
  let result = '';
  let lastIndex = 0;

  visitVariables(templateText, ({ name, startIndex, endIndex }) => {
    result += templateText.slice(lastIndex, startIndex);
    const value = values[name];
    if (value != null) {
      result += escapeMarkdown ? escapeInlineMarkdown(value) : value;
    }
    lastIndex = endIndex + 1;
  });

  return result + templateText.slice(lastIndex);
};

const normalizeColumnWeights = (
  columnWeights: number[] | undefined,
  columnCount: number,
): number[] => {
  if (columnWeights && columnWeights.length > 0) {
    const normalizedWidths = Array.from({ length: columnCount }, (_, index) => {
      const width = columnWeights[index];
      return typeof width === 'number' && Number.isFinite(width) && width > 0 ? width : 1;
    });

    const totalWidth = normalizedWidths.reduce((sum, width) => sum + width, 0);
    if (totalWidth > 0) return normalizedWidths.map((width) => (width / totalWidth) * 100);
  }

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
const STATIC_CONTAINER_KINDS = new Set(['absolute', 'stack', 'row', 'box']);
const STATIC_LEAF_KINDS = new Set([
  'spacer',
  'text',
  'image',
  'svg',
  'rectangle',
  'ellipse',
  'line',
]);
const ABSOLUTE_PARENT_KINDS = new Set(['page', 'header', 'footer', 'static', 'box']);
const STATIC_BLOCK_KINDS = new Set(['header', 'footer', 'static']);

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

const validateAbsolutePlacement = (
  node: PdfJsxChild | PdfJsxChild[],
  parentKind: string | undefined = undefined,
) => {
  for (const child of flattenForSplitting(node)) {
    if (!isPdfJsxElement(child)) continue;

    if (child.kind === 'absolute' && (!parentKind || !ABSOLUTE_PARENT_KINDS.has(parentKind))) {
      throw new Error(
        '@pdfme/jsx: <Absolute> can only be used inside <Page>, <Header>, <Footer>, <Static>, or <Box>.',
      );
    }

    validateAbsolutePlacement(child.children, child.kind);
  }
};

const validateStaticPlacement = (children: PdfJsxChild[], hasDocument: boolean) => {
  for (const child of flattenChildren(children)) {
    if (!isPdfJsxElement(child)) {
      if (hasDocument && String(child).trim() !== '') {
        throw new Error(
          '@pdfme/jsx: <Document> children must be <Header>, <Footer>, <Static>, or <Page>.',
        );
      }
      continue;
    }

    if (STATIC_BLOCK_KINDS.has(child.kind)) {
      if (!hasDocument) {
        throw new Error(
          '@pdfme/jsx: <Header>, <Footer>, and <Static> can only be used as direct children of <Document>.',
        );
      }
      if (child.kind === 'static') {
        // Validate dynamic JavaScript callers before static children are extracted for layout.
        const placement = getStaticPlacement(child as PdfJsxElement<'static'>);
        if (placement === 'bottom' && hasElementKind(child.children, 'absolute')) {
          throw new Error(
            '@pdfme/jsx: <Absolute> is not supported inside bottom <Static>. Use top <Static>, <Header>, <Footer>, or <Page> for fixed page coordinates.',
          );
        }
      }
      validateStaticChildren(child.children);
      continue;
    }

    if (hasDocument && child.kind !== 'page') {
      throw new Error(
        '@pdfme/jsx: <Document> children must be <Header>, <Footer>, <Static>, or <Page>.',
      );
    }

    validateNoNestedStaticBlock(child);
  }
};

const validateNoNestedStaticBlock = (node: PdfJsxChild) => {
  if (!isPdfJsxElement(node)) return;
  for (const child of flattenForSplitting(node.children)) {
    if (isPdfJsxElement(child) && STATIC_BLOCK_KINDS.has(child.kind)) {
      throw new Error(
        '@pdfme/jsx: <Header>, <Footer>, and <Static> can only be used as direct children of <Document>.',
      );
    }
    validateNoNestedStaticBlock(child);
  }
};

const hasElementKind = (node: PdfJsxChild | PdfJsxChild[], kind: string): boolean => {
  for (const child of flattenForSplitting(node)) {
    if (!isPdfJsxElement(child)) continue;
    if (child.kind === kind || hasElementKind(child.children, kind)) return true;
  }
  return false;
};

const validateStaticChildren = (children: PdfJsxChild | PdfJsxChild[]) => {
  for (const child of flattenForSplitting(children)) {
    if (!isPdfJsxElement(child)) continue;

    if (STATIC_CONTAINER_KINDS.has(child.kind)) {
      validateStaticChildren(child.children);
      continue;
    }

    if (!STATIC_LEAF_KINDS.has(child.kind)) {
      throw new Error(
        `@pdfme/jsx: <Static> does not support <${child.kind}> children. Supported: read-only Stack, Row, Box, Spacer, Text, Image, Svg, Rectangle, Ellipse, and Line.`,
      );
    }

    validateStaticLeafProps(child);
  }
};

const validateStaticLeafProps = (element: PdfJsxElement) => {
  if (element.kind !== 'text' && element.kind !== 'image' && element.kind !== 'svg') return;
  const props = element.props as { name?: unknown; readOnly?: unknown };
  if (props.readOnly === false || (props.name != null && props.readOnly !== true)) {
    throw new Error('@pdfme/jsx: <Static> children must be read-only.');
  }
};
