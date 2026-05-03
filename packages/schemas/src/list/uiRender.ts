import type * as CSS from 'csstype';
import { UIRenderProps } from '@pdfme/common';
import { isEditable } from '../utils.js';
import { makeElementPlainTextContentEditable } from '../text/uiRender.js';
import {
  DEFAULT_ALIGNMENT,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_FONT_COLOR,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  PLACEHOLDER_FONT_COLOR,
} from '../text/constants.js';
import type { ListSchema } from './types.js';
import { calculateListLayout, normalizeListItems } from './helper.js';

const getText = (element: HTMLElement): string => {
  let text = element.innerText;
  if (text.endsWith('\n')) {
    text = text.slice(0, -1);
  }
  return text;
};

const setStyles = (element: HTMLElement, styles: CSS.Properties) => {
  Object.assign(element.style, styles);
};

export const uiRender = async (arg: UIRenderProps<ListSchema>) => {
  const { rootElement, schema, value, mode, onChange, stopEditing, tabIndex, placeholder } = arg;
  const editable = isEditable(mode, schema);
  const usePlaceholder = editable && !value && Boolean(placeholder);
  const sourceValue = usePlaceholder ? placeholder || '' : value;
  const items = normalizeListItems(sourceValue);
  const range = schema.__itemRange ?? { start: 0, end: items.length };
  const visibleItems = items.slice(range.start, range.end);
  const renderItems = visibleItems.length > 0 ? visibleItems : editable ? [''] : [];

  rootElement.innerHTML = '';
  setStyles(rootElement, {
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundColor: schema.backgroundColor || 'transparent',
    overflow: 'visible',
  });

  const layout = await calculateListLayout({
    schema,
    items: renderItems,
    startIndex: range.start,
    options: arg.options,
    _cache: arg._cache,
  });

  const bodyElements: HTMLDivElement[] = [];
  const textDecorations = [];
  if (schema.strikethrough) textDecorations.push('line-through');
  if (schema.underline) textDecorations.push('underline');

  let offsetY = 0;
  for (const item of layout.items) {
    const row = document.createElement('div');
    setStyles(row, {
      position: 'absolute',
      top: `${offsetY}mm`,
      left: '0mm',
      width: `${schema.width}mm`,
      height: `${item.height}mm`,
    });

    const marker = document.createElement('div');
    marker.innerText = item.marker;
    setStyles(marker, {
      position: 'absolute',
      top: '0mm',
      left: '0mm',
      width: `${layout.markerWidth}mm`,
      height: '100%',
      color: schema.fontColor || DEFAULT_FONT_COLOR,
      fontFamily: schema.fontName ? `'${schema.fontName}'` : 'inherit',
      fontSize: `${schema.fontSize ?? DEFAULT_FONT_SIZE}pt`,
      letterSpacing: `${schema.characterSpacing ?? DEFAULT_CHARACTER_SPACING}pt`,
      lineHeight: `${schema.lineHeight ?? DEFAULT_LINE_HEIGHT}em`,
      textAlign: 'right',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      textDecoration: textDecorations.join(' '),
      cursor: editable ? 'text' : 'default',
    });

    const body = document.createElement('div');
    body.innerText = item.item;
    setStyles(body, {
      position: 'absolute',
      top: '0mm',
      left: `${layout.markerWidth + layout.markerGap}mm`,
      width: `${layout.bodyWidth}mm`,
      minHeight: '100%',
      color: usePlaceholder ? PLACEHOLDER_FONT_COLOR : schema.fontColor || DEFAULT_FONT_COLOR,
      fontFamily: schema.fontName ? `'${schema.fontName}'` : 'inherit',
      fontSize: `${schema.fontSize ?? DEFAULT_FONT_SIZE}pt`,
      letterSpacing: `${schema.characterSpacing ?? DEFAULT_CHARACTER_SPACING}pt`,
      lineHeight: `${schema.lineHeight ?? DEFAULT_LINE_HEIGHT}em`,
      textAlign: schema.alignment ?? DEFAULT_ALIGNMENT,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      outline: 'none',
      backgroundColor: 'transparent',
      textDecoration: textDecorations.join(' '),
      cursor: editable ? 'text' : 'default',
    });

    if (editable) {
      makeElementPlainTextContentEditable(body);
      body.tabIndex = tabIndex || 0;
      body.addEventListener('focus', () => {
        if (usePlaceholder) {
          body.innerText = '';
          body.style.color = schema.fontColor || DEFAULT_FONT_COLOR;
        }
      });
      body.addEventListener('blur', () => {
        if (!onChange) return;
        const editedItems = bodyElements.map(getText);
        const nextItems = usePlaceholder ? editedItems : [...items];
        if (!usePlaceholder) {
          nextItems.splice(range.start, visibleItems.length, ...editedItems);
        }
        onChange({ key: 'content', value: nextItems.join('\n') });
        if (stopEditing) stopEditing();
      });
      bodyElements.push(body);
    }

    row.appendChild(marker);
    row.appendChild(body);
    rootElement.appendChild(row);
    offsetY += item.height;
  }

  if (editable && mode === 'designer' && bodyElements[0]) {
    setTimeout(() => {
      bodyElements[0].focus();
      const selection = window.getSelection();
      const range = document.createRange();
      if (selection && range) {
        range.selectNodeContents(bodyElements[0]);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });
  }

  if (layout.items.length > 0 && schema.height !== layout.totalHeight && onChange) {
    onChange({ key: 'height', value: layout.totalHeight });
  }
};
