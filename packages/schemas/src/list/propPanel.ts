import type { PropPanel, PropPanelSchema, PropPanelWidgetProps } from '@pdfme/common';
import { propPanel as parentPropPanel } from '../text/propPanel.js';
import type { ListSchema } from './types.js';
import {
  DEFAULT_INDENT_SIZE,
  DEFAULT_ITEM_SPACING,
  DEFAULT_LIST_STYLE,
  DEFAULT_MARKER_GAP,
  DEFAULT_MARKER_WIDTH,
  LIST_STYLE_BULLET,
  LIST_STYLE_ORDERED,
} from './constants.js';

export const propPanel: PropPanel<ListSchema> = {
  schema: (propPanelProps: Omit<PropPanelWidgetProps, 'rootElement'>) => {
    if (typeof parentPropPanel.schema !== 'function') {
      throw new Error('Oops, is text schema no longer a function?');
    }
    const parentSchema = parentPropPanel.schema(propPanelProps);
    const i18n = (propPanelProps as PropPanelWidgetProps).i18n;
    const listSchema: Record<string, PropPanelSchema> = { ...parentSchema };
    delete listSchema.useDynamicFontSize;
    delete listSchema.dynamicFontSize;

    return {
      ...listSchema,
      '-------': { type: 'void', widget: 'Divider' },
      listStyle: {
        title: i18n('schemas.list.listStyle'),
        type: 'string',
        widget: 'select',
        props: {
          options: [
            { label: i18n('schemas.list.bullet'), value: LIST_STYLE_BULLET },
            { label: i18n('schemas.list.ordered'), value: LIST_STYLE_ORDERED },
          ],
        },
        span: 24,
      },
      markerWidth: {
        title: i18n('schemas.list.markerWidth'),
        type: 'number',
        widget: 'inputNumber',
        props: { min: 0 },
        span: 6,
      },
      markerGap: {
        title: i18n('schemas.list.markerGap'),
        type: 'number',
        widget: 'inputNumber',
        props: { min: 0 },
        span: 6,
      },
      indentSize: {
        title: i18n('schemas.list.indentSize'),
        type: 'number',
        widget: 'inputNumber',
        props: { min: 0 },
        span: 6,
      },
      itemSpacing: {
        title: i18n('schemas.list.itemSpacing'),
        type: 'number',
        widget: 'inputNumber',
        props: { min: 0 },
        span: 6,
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
    markerWidth: DEFAULT_MARKER_WIDTH,
    markerGap: DEFAULT_MARKER_GAP,
    indentSize: DEFAULT_INDENT_SIZE,
    itemSpacing: DEFAULT_ITEM_SPACING,
    dynamicFontSize: undefined,
    verticalAlignment: 'top',
  },
};
