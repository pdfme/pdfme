import {
  getDynamicContainerMetadata,
  replacePlaceholders,
  type DynamicLayoutArgs,
  type DynamicLayoutCallbackResult,
  type DynamicLayoutResult,
  type Schema,
} from '@pdfme/common';
import { getDynamicLayoutForList } from './list/dynamicTemplate.js';
import { getDynamicLayoutForMultiVariableText } from './multiVariableText/dynamicTemplate.js';
import { getDynamicLayoutForTable } from './tables/dynamicTemplate.js';
import { TEXT_OVERFLOW_EXPAND } from './text/constants.js';
import { getDynamicLayoutForText } from './text/dynamicTemplate.js';

export {
  BUILT_IN_DYNAMIC_LAYOUT_SPLIT_UNITS,
  LIST_ITEM_SPLIT_UNIT,
  TABLE_BODY_SPLIT_UNIT,
  TEXT_LINE_SPLIT_UNIT,
  createListItemSplitRange,
  createTableBodySplitRange,
  createTextLineSplitRange,
  getListItemRange,
  getTableBodyRange,
  getTextLineRange,
  type BuiltInDynamicLayoutSplitUnit,
} from './splitRange.js';

const isExpandableTextSchema = (schema: Schema) =>
  (schema.type === 'text' || schema.type === 'multiVariableText') &&
  (schema as { overflow?: unknown }).overflow === TEXT_OVERFLOW_EXPAND;

export const isDynamicLayoutSchema = (schema: Schema) =>
  schema.type === 'table' ||
  schema.type === 'list' ||
  isExpandableTextSchema(schema) ||
  getDynamicContainerMetadata(schema) != null;

const normalizeDynamicLayoutResult = (result: DynamicLayoutCallbackResult): DynamicLayoutResult => {
  const dynamicLayout = Array.isArray(result) ? { heights: result } : result;
  return {
    ...dynamicLayout,
    heights: dynamicLayout.heights.length === 0 ? [0] : dynamicLayout.heights,
  };
};

const getSchemaValue = (schema: Schema, args: DynamicLayoutArgs): string => {
  if (!schema.readOnly) {
    return args.input?.[schema.name] || '';
  }

  if (schema.type !== 'text' && schema.type !== 'multiVariableText') {
    return schema.content || '';
  }

  return replacePlaceholders({
    content: schema.content || '',
    variables: args.input ?? {},
    schemas: args.schemas ?? [args.pageSchemas ?? []],
  });
};

const sumHeights = (layout: DynamicLayoutResult) =>
  layout.heights.reduce((total, height) => total + height, 0);

const getDynamicLayoutForContainer = async (
  args: DynamicLayoutArgs,
): Promise<DynamicLayoutResult | undefined> => {
  const metadata = getDynamicContainerMetadata(args.schema);
  if (!metadata || !args.pageSchemas) return undefined;

  const pageOrder = new Map(args.pageSchemas.map((schema, index) => [schema.name, index]));
  const pageSchemaMap = new Map(args.pageSchemas.map((schema) => [schema.name, schema]));
  const children = metadata.childNames
    .map((childName) => pageSchemaMap.get(childName))
    .filter((schema): schema is Schema => schema != null)
    .sort((a, b) => {
      if (a.position.y !== b.position.y) return a.position.y - b.position.y;
      if (a.position.x !== b.position.x) return a.position.x - b.position.x;
      return (pageOrder.get(a.name) ?? 0) - (pageOrder.get(b.name) ?? 0);
    });
  if (children.length === 0) return undefined;

  let localOffset = 0;
  let contentBottom = 0;
  for (const child of children) {
    const value = getSchemaValue(child, args);
    const childLayout = normalizeDynamicLayoutResult(
      await getDynamicLayoutForSchema(value, { ...args, schema: child }),
    );
    const localY = Math.max(0, child.position.y - args.schema.position.y + localOffset);
    const dynamicHeight = sumHeights(childLayout);
    contentBottom = Math.max(contentBottom, localY + dynamicHeight);

    const originalLocalEndY = Math.max(0, child.position.y - args.schema.position.y) + child.height;
    if (childLayout.contributesToFlow !== false) {
      localOffset = localY + dynamicHeight - originalLocalEndY;
    }
  }

  const height = Math.max(args.schema.height, contentBottom + (metadata.paddingBottom ?? 0));
  return {
    heights: [height],
    contributesToFlow: false,
  };
};

export const getDynamicLayoutForSchema = (
  value: string,
  args: DynamicLayoutArgs,
): Promise<DynamicLayoutCallbackResult> => {
  if (getDynamicContainerMetadata(args.schema) != null) {
    return getDynamicLayoutForContainer(args).then((layout) => layout ?? [args.schema.height]);
  }

  switch (args.schema.type) {
    case 'table':
      return getDynamicLayoutForTable(value, args);
    case 'list':
      return getDynamicLayoutForList(value, args);
    case 'text':
      return getDynamicLayoutForText(value, args);
    case 'multiVariableText':
      return getDynamicLayoutForMultiVariableText(value, args);
    default:
      return Promise.resolve([args.schema.height]);
  }
};
