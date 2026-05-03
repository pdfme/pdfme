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
import type { ListItem, ListSchema } from './types.js';
import {
  calculateListLayout,
  normalizeListItemEntries,
  normalizeListItems,
  serializeListItems,
} from './helper.js';
import { MAX_INDENT_LEVEL } from './constants.js';

const focusDataKey = 'pdfmeListFocusIndex';

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

const focusBody = (body: HTMLDivElement) => {
  body.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  if (selection && range) {
    range.selectNodeContents(body);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }
};

const createActionButton = (arg: {
  label: string;
  ariaLabel: string;
  disabled?: boolean;
  onClick: () => void;
}) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.innerText = arg.label;
  button.setAttribute('aria-label', arg.ariaLabel);
  button.disabled = Boolean(arg.disabled);
  setStyles(button, {
    width: '18px',
    height: '18px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0',
    border: '1px solid #d9d9d9',
    borderRadius: '3px',
    background: '#ffffff',
    color: '#333333',
    fontSize: '11px',
    lineHeight: '1',
    cursor: arg.disabled ? 'not-allowed' : 'pointer',
    opacity: arg.disabled ? 0.45 : 1,
  });
  button.addEventListener('mousedown', (event) => {
    event.preventDefault();
  });
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!arg.disabled) arg.onClick();
  });
  return button;
};

export const uiRender = async (arg: UIRenderProps<ListSchema>) => {
  const { rootElement, schema, value, mode, onChange, stopEditing, tabIndex, placeholder } = arg;
  const editable = isEditable(mode, schema);
  const showControls = editable && (mode === 'form' || mode === 'designer');
  const usePlaceholder = editable && !value && Boolean(placeholder);
  const sourceValue = usePlaceholder ? placeholder || '' : value;
  const items = normalizeListItems(sourceValue);
  const originalItems = normalizeListItemEntries(value);
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

  const getEditedItems = (): ListItem[] =>
    layout.items.map((item, index) => ({
      level: item.level,
      text: getText(bodyElements[index]),
    }));

  const getNextItems = () => {
    const editedItems = getEditedItems();
    if (usePlaceholder) return editedItems;

    const nextItems = [...originalItems];
    nextItems.splice(range.start, visibleItems.length, ...editedItems);
    return nextItems;
  };

  const commitItems = (nextItems: ListItem[], focusIndex?: number) => {
    if (!onChange) return;
    if (focusIndex !== undefined) {
      rootElement.dataset[focusDataKey] = String(focusIndex);
    }
    onChange({ key: 'content', value: serializeListItems(nextItems) });
  };

  const updateItems = (
    rowIndex: number,
    mutate: (nextItems: ListItem[], itemIndex: number) => number | undefined,
  ) => {
    const nextItems = getNextItems();
    if (nextItems.length === 0) {
      nextItems.push({ level: 0, text: '' });
    }
    const itemIndex = Math.min(Math.max(range.start + rowIndex, 0), nextItems.length - 1);
    const focusIndex = mutate(nextItems, itemIndex);
    commitItems(nextItems, focusIndex);
  };

  let offsetY = 0;
  for (let index = 0; index < layout.items.length; index += 1) {
    const item = layout.items[index];
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
      left: `${item.markerX}mm`,
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
      left: `${item.bodyX}mm`,
      width: `${item.bodyWidth}mm`,
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
        commitItems(getNextItems());
        if (stopEditing) stopEditing();
      });
      body.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          updateItems(index, (nextItems, itemIndex) => {
            nextItems.splice(itemIndex + 1, 0, {
              level: nextItems[itemIndex]?.level ?? 0,
              text: '',
            });
            return itemIndex + 1;
          });
        } else if (event.key === 'Tab') {
          event.preventDefault();
          updateItems(index, (nextItems, itemIndex) => {
            const itemToUpdate = nextItems[itemIndex];
            itemToUpdate.level = event.shiftKey
              ? Math.max(itemToUpdate.level - 1, 0)
              : Math.min(itemToUpdate.level + 1, MAX_INDENT_LEVEL);
            return itemIndex;
          });
        } else if (event.key === 'Backspace' && getText(body) === '') {
          event.preventDefault();
          updateItems(index, (nextItems, itemIndex) => {
            if (nextItems.length <= 1) {
              nextItems.splice(0);
              return undefined;
            }
            nextItems.splice(itemIndex, 1);
            return Math.min(itemIndex, nextItems.length - 1);
          });
        }
      });
      bodyElements.push(body);
    }

    row.appendChild(marker);
    row.appendChild(body);
    if (showControls) {
      const controls = document.createElement('div');
      setStyles(controls, {
        position: 'absolute',
        top: '0mm',
        right: '-82px',
        display: 'flex',
        gap: '2px',
      });
      controls.appendChild(
        createActionButton({
          label: '+',
          ariaLabel: arg.i18n('schemas.list.addItem'),
          onClick: () => {
            updateItems(index, (nextItems, itemIndex) => {
              nextItems.splice(itemIndex + 1, 0, {
                level: nextItems[itemIndex]?.level ?? 0,
                text: '',
              });
              return itemIndex + 1;
            });
          },
        }),
      );
      controls.appendChild(
        createActionButton({
          label: '-',
          ariaLabel: arg.i18n('schemas.list.removeItem'),
          onClick: () => {
            updateItems(index, (nextItems, itemIndex) => {
              if (nextItems.length <= 1) {
                nextItems.splice(0);
                return undefined;
              }
              nextItems.splice(itemIndex, 1);
              return Math.min(itemIndex, nextItems.length - 1);
            });
          },
        }),
      );
      controls.appendChild(
        createActionButton({
          label: '<',
          ariaLabel: arg.i18n('schemas.list.outdentItem'),
          disabled: item.level === 0,
          onClick: () => {
            updateItems(index, (nextItems, itemIndex) => {
              nextItems[itemIndex].level = Math.max(nextItems[itemIndex].level - 1, 0);
              return itemIndex;
            });
          },
        }),
      );
      controls.appendChild(
        createActionButton({
          label: '>',
          ariaLabel: arg.i18n('schemas.list.indentItem'),
          disabled: item.level >= MAX_INDENT_LEVEL,
          onClick: () => {
            updateItems(index, (nextItems, itemIndex) => {
              nextItems[itemIndex].level = Math.min(
                nextItems[itemIndex].level + 1,
                MAX_INDENT_LEVEL,
              );
              return itemIndex;
            });
          },
        }),
      );
      row.appendChild(controls);
    }
    rootElement.appendChild(row);
    offsetY += item.height;
  }

  const requestedFocusIndex = Number(rootElement.dataset[focusDataKey]);
  delete rootElement.dataset[focusDataKey];
  const relativeFocusIndex = requestedFocusIndex - range.start;

  if (
    editable &&
    Number.isFinite(requestedFocusIndex) &&
    bodyElements[relativeFocusIndex]
  ) {
    setTimeout(() => focusBody(bodyElements[relativeFocusIndex]));
  } else if (editable && mode === 'designer' && bodyElements[0]) {
    setTimeout(() => {
      focusBody(bodyElements[0]);
    });
  }

  if (layout.items.length > 0 && schema.height !== layout.totalHeight && onChange) {
    onChange({ key: 'height', value: layout.totalHeight });
  }
};
