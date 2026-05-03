import type { PropPanel, PropPanelSchema, PropPanelWidgetProps } from '@pdfme/common';
import { propPanel as parentPropPanel } from '../text/propPanel.js';
import type { ListSchema } from './types.js';
import {
  DEFAULT_INDENT_SIZE,
  DEFAULT_ITEM_SPACING,
  DEFAULT_LIST_STYLE,
  DEFAULT_MARKER,
  DEFAULT_MARKER_GAP,
  DEFAULT_MARKER_WIDTH,
  DEFAULT_ORDERED_SUFFIX,
  DEFAULT_START_NUMBER,
  LIST_STYLE_BULLET,
  LIST_STYLE_ORDERED,
} from './constants.js';

export const propPanel: PropPanel<ListSchema> = {
  schema: (propPanelProps: Omit<PropPanelWidgetProps, 'rootElement'>) => {
    if (typeof parentPropPanel.schema !== 'function') {
      throw new Error('Oops, is text schema no longer a function?');
    }
    const parentSchema = parentPropPanel.schema(propPanelProps);
    const listSchema: Record<string, PropPanelSchema> = { ...parentSchema };
    delete listSchema.useDynamicFontSize;
    delete listSchema.dynamicFontSize;

    return {
      ...listSchema,
      '-------': { type: 'void', widget: 'Divider' },
      listStyle: {
        title: 'List Style',
        type: 'string',
        widget: 'select',
        props: {
          options: [
            { label: 'Bullet', value: LIST_STYLE_BULLET },
            { label: 'Ordered', value: LIST_STYLE_ORDERED },
          ],
        },
        span: 12,
      },
      marker: {
        title: 'Marker',
        type: 'string',
        widget: 'input',
        span: 12,
      },
      startNumber: {
        title: 'Start Number',
        type: 'number',
        widget: 'inputNumber',
        props: { min: 0 },
        span: 8,
      },
      orderedSuffix: {
        title: 'Ordered Suffix',
        type: 'string',
        widget: 'input',
        span: 8,
      },
      markerWidth: {
        title: 'Marker Width',
        type: 'number',
        widget: 'inputNumber',
        props: { min: 0 },
        span: 8,
      },
      markerGap: {
        title: 'Marker Gap',
        type: 'number',
        widget: 'inputNumber',
        props: { min: 0 },
        span: 8,
      },
      indentSize: {
        title: 'Indent Size',
        type: 'number',
        widget: 'inputNumber',
        props: { min: 0 },
        span: 8,
      },
      itemSpacing: {
        title: 'Item Spacing',
        type: 'number',
        widget: 'inputNumber',
        props: { min: 0 },
        span: 8,
      },
    };
  },
  widgets: parentPropPanel.widgets,
  defaultSchema: {
    ...parentPropPanel.defaultSchema,
    type: 'list',
    content: JSON.stringify(['First item', 'Second item']),
    width: 80,
    height: 20,
    listStyle: DEFAULT_LIST_STYLE,
    marker: DEFAULT_MARKER,
    startNumber: DEFAULT_START_NUMBER,
    orderedSuffix: DEFAULT_ORDERED_SUFFIX,
    markerWidth: DEFAULT_MARKER_WIDTH,
    markerGap: DEFAULT_MARKER_GAP,
    indentSize: DEFAULT_INDENT_SIZE,
    itemSpacing: DEFAULT_ITEM_SPACING,
    dynamicFontSize: undefined,
    verticalAlignment: 'top',
  },
};
