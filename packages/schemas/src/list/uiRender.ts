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
const actionDataKey = 'pdfmeListAction';
const internalFocusDataKey = 'pdfmeListInternalFocus';

const isComposingKeyboardEvent = (event: KeyboardEvent) =>
  event.isComposing || event.keyCode === 229;

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

const getCaretRangeFromPoint = (x: number, y: number): Range | null => {
  const documentWithCaret = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };

  if (documentWithCaret.caretRangeFromPoint) {
    return documentWithCaret.caretRangeFromPoint(x, y);
  }

  const caretPosition = documentWithCaret.caretPositionFromPoint?.(x, y);
  if (!caretPosition) return null;

  const range = document.createRange();
  range.setStart(caretPosition.offsetNode, caretPosition.offset);
  range.collapse(true);
  return range;
};

const focusBodyFromMouseEvent = (body: HTMLDivElement, event: MouseEvent) => {
  body.focus();

  const range = getCaretRangeFromPoint(event.clientX, event.clientY);
  if (!range || !body.contains(range.startContainer)) return;

  const selection = window.getSelection();
  if (!selection) return;

  selection.removeAllRanges();
  selection.addRange(range);
};

const createActionButton = (arg: {
  label: string;
  ariaLabel: string;
  disabled?: boolean;
  onPressStart?: () => void;
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
  button.addEventListener('pointerdown', (event) => {
    arg.onPressStart?.();
    event.stopPropagation();
  });
  button.addEventListener('mousedown', (event) => {
    arg.onPressStart?.();
    event.preventDefault();
    event.stopPropagation();
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
  const renderItems = visibleItems;

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

  const preserveEditingForAction = () => {
    rootElement.dataset[actionDataKey] = 'true';
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
    preserveEditingForAction();
    commitItems(nextItems, focusIndex);
  };

  const preserveEditingForInternalFocus = () => {
    rootElement.dataset[internalFocusDataKey] = 'true';
  };

  const handleInternalFocusPointer = (event: Event) => {
    preserveEditingForInternalFocus();
    event.stopPropagation();
  };

  const handleBodyMouseDown = (body: HTMLDivElement, event: MouseEvent) => {
    handleInternalFocusPointer(event);
    focusBodyFromMouseEvent(body, event);
  };

  const appendEmptyListControls = () => {
    const controls = document.createElement('div');
    controls.addEventListener('pointerdown', preserveEditingForAction);
    controls.addEventListener('mousedown', preserveEditingForAction);
    setStyles(controls, {
      position: 'absolute',
      top: '0mm',
      right: '-20px',
      display: 'flex',
      gap: '2px',
    });
    controls.appendChild(
      createActionButton({
        label: '+',
        ariaLabel: arg.i18n('schemas.list.addItem'),
        onPressStart: preserveEditingForAction,
        onClick: () => {
          const nextItems = [...originalItems];
          nextItems.splice(range.start, 0, { level: 0, text: '' });
          commitItems(nextItems, range.start);
        },
      }),
    );
    rootElement.appendChild(controls);
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
      body.addEventListener('pointerdown', handleInternalFocusPointer);
      body.addEventListener('mousedown', (event) => {
        handleBodyMouseDown(body, event);
      });
      body.addEventListener('click', (event) => {
        event.stopPropagation();
        focusBodyFromMouseEvent(body, event);
      });
      body.addEventListener('focus', () => {
        if (usePlaceholder) {
          body.innerText = '';
          body.style.color = schema.fontColor || DEFAULT_FONT_COLOR;
        }
      });
      body.addEventListener('blur', (event) => {
        const isListAction = rootElement.dataset[actionDataKey] === 'true';
        const relatedTarget = event.relatedTarget;
        const isInternalFocus =
          rootElement.dataset[internalFocusDataKey] === 'true' ||
          (relatedTarget instanceof Node && rootElement.contains(relatedTarget));
        delete rootElement.dataset[internalFocusDataKey];

        if (isListAction || isInternalFocus) return;
        if (!onChange) return;
        commitItems(getNextItems());
        if (stopEditing) stopEditing();
      });
      body.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          if (isComposingKeyboardEvent(event)) return;
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
      controls.addEventListener('pointerdown', preserveEditingForAction);
      controls.addEventListener('mousedown', preserveEditingForAction);
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
          onPressStart: preserveEditingForAction,
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
          onPressStart: preserveEditingForAction,
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
          onPressStart: preserveEditingForAction,
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
          onPressStart: preserveEditingForAction,
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

  if (showControls && visibleItems.length === 0) {
    appendEmptyListControls();
  }

  const requestedFocusIndex = Number(rootElement.dataset[focusDataKey]);
  delete rootElement.dataset[focusDataKey];
  delete rootElement.dataset[actionDataKey];
  delete rootElement.dataset[internalFocusDataKey];
  const relativeFocusIndex = requestedFocusIndex - range.start;

  if (editable && Number.isFinite(requestedFocusIndex) && bodyElements[relativeFocusIndex]) {
    setTimeout(() => focusBody(bodyElements[relativeFocusIndex]));
  } else if (editable && mode === 'designer' && bodyElements[0]) {
    setTimeout(() => {
      if (!rootElement.contains(document.activeElement)) {
        focusBody(bodyElements[0]);
      }
    });
  }

  if (schema.height !== layout.totalHeight && onChange) {
    onChange({ key: 'height', value: layout.totalHeight });
  }
};
