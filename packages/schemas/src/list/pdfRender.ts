import type { PDFRenderProps } from '@pdfme/common';
import type { ListSchema } from './types.js';
import { pdfRender as textPdfRender } from '../text/pdfRender.js';
import { rectangle } from '../shapes/rectAndEllipse.js';
import { calculateListLayout, normalizeListItems } from './helper.js';

const rectanglePdfRender = rectangle.pdf;

export const pdfRender = async (arg: PDFRenderProps<ListSchema>) => {
  const { schema, value } = arg;
  const items = normalizeListItems(value);
  const range = schema.__itemRange ?? { start: 0, end: items.length };
  const visibleItems = items.slice(range.start, range.end);

  if (visibleItems.length === 0) return;

  const layout = await calculateListLayout({
    schema,
    items: visibleItems,
    startIndex: range.start,
    options: arg.options,
    _cache: arg._cache,
  });

  if (schema.backgroundColor) {
    await rectanglePdfRender({
      ...arg,
      schema: {
        ...schema,
        type: 'rectangle',
        borderWidth: 0,
        borderColor: '',
        color: schema.backgroundColor,
      },
    });
  }

  let y = schema.position.y;
  for (const item of layout.items) {
    await textPdfRender({
      ...arg,
      value: item.marker,
      schema: {
        ...schema,
        type: 'text',
        position: { x: schema.position.x, y },
        width: layout.markerWidth,
        height: item.height,
        backgroundColor: '',
        alignment: 'right',
        verticalAlignment: 'top',
        dynamicFontSize: undefined,
      },
    });

    await textPdfRender({
      ...arg,
      value: item.item,
      schema: {
        ...schema,
        type: 'text',
        position: {
          x: schema.position.x + layout.markerWidth + layout.markerGap,
          y,
        },
        width: layout.bodyWidth,
        height: item.height,
        backgroundColor: '',
        verticalAlignment: 'top',
        dynamicFontSize: undefined,
      },
    });

    y += item.height;
  }
};
