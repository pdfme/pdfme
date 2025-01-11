import type * as CSS from 'csstype';
import type { Font as FontKitFont } from 'fontkit';
import { UIRenderProps, getDefaultFont } from '@pdfme/common';
import type {
  RichTextLetter,
  RichTextLetterStyle,
  RichTextSchema,
  RichTextLetterStyleHandler,
} from './types';
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_ALIGNMENT,
  VERTICAL_ALIGN_TOP,
  VERTICAL_ALIGN_MIDDLE,
  VERTICAL_ALIGN_BOTTOM,
  DEFAULT_VERTICAL_ALIGNMENT,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_FONT_COLOR,
  PLACEHOLDER_FONT_COLOR,
} from './constants.js';
import {
  calculateDynamicFontSize,
  getFontKitFont,
  getBrowserVerticalFontAdjustments,
  isFirefox,
  content2RichTextLetters,
  richTextLetters2Html,
  editableHtml2RichTextLetters,
  CSSProps2RichTextLetterStyle,
  schema2RichTextLetterStyle,
  parseFontName,
} from './helper.js';
import { isEditable } from '../utils.js';
import { DEFAULT_OPACITY } from '../constants';

const replaceUnsupportedChars = (text: string, fontKitFont: FontKitFont): string => {
  const charSupportCache: { [char: string]: boolean } = {};

  const isCharSupported = (char: string): boolean => {
    if (char in charSupportCache) {
      return charSupportCache[char];
    }
    const isSupported = fontKitFont.hasGlyphForCodePoint(char.codePointAt(0) || 0);
    charSupportCache[char] = isSupported;
    return isSupported;
  };

  const segments = text.split(/(\r\n|\n|\r)/);

  return segments
    .map((segment) => {
      if (/\r\n|\n|\r/.test(segment)) {
        return segment;
      }

      return segment
        .split('')
        .map((char) => {
          if (/\s/.test(char) || char.charCodeAt(0) < 32) {
            return char;
          }

          return isCharSupported(char) ? char : '〿';
        })
        .join('');
    })
    .join('');
};

export const uiRender = async (arg: UIRenderProps<RichTextSchema>) => {
  const { value, schema, mode, onChange, stopEditing, tabIndex, placeholder, options, _cache } =
    arg;
  const usePlaceholder = isEditable(mode, schema) && placeholder && !value;
  const getText = (element: HTMLDivElement) => {
    let text = element.innerText;
    if (text.endsWith('\n')) {
      // contenteditable adds additional newline char retrieved with innerText
      text = text.slice(0, -1);
    }
    return text;
  };
  const font = options?.font || getDefaultFont();
  const [fontKitFont, textBlock] = await Promise.all([
    getFontKitFont(schema.fontName, font, _cache),
    buildStyledTextContainer(arg, usePlaceholder ? placeholder : value),
  ]);

  const processedText = replaceUnsupportedChars(value, fontKitFont);
  const richTextLetters = content2RichTextLetters(processedText);

  if (!isEditable(mode, schema)) {
    // Read-only mode
    textBlock.innerHTML = richTextLetters2Html(richTextLetters);
    return;
  }

  makeElementPlainTextContentEditable({ element: textBlock, schema, _cache });
  textBlock.tabIndex = tabIndex || 0;
  textBlock.innerHTML =
    mode === 'designer'
      ? richTextLetters2Html(content2RichTextLetters(value))
      : richTextLetters2Html(richTextLetters);
  textBlock.addEventListener('blur', (e: Event) => {
    const letters = editableHtml2RichTextLetters(
      e.target as HTMLDivElement,
      schema2RichTextLetterStyle(schema)
    );
    onChange && onChange({ key: 'content', value: JSON.stringify(letters) });
    stopEditing && stopEditing();
  });

  if (schema.dynamicFontSize) {
    let dynamicFontSize: undefined | number = undefined;
    const font = options?.font || getDefaultFont();
    const fontKitFont = await getFontKitFont(schema.fontName, font, _cache);

    textBlock.addEventListener('keyup', () => {
      setTimeout(() => {
        void (async () => {
          if (!textBlock.textContent) return;
          dynamicFontSize = await calculateDynamicFontSize({
            textSchema: schema,
            font,
            value: getText(textBlock),
            startingFontSize: dynamicFontSize,
            _cache,
          });
          textBlock.style.fontSize = `${dynamicFontSize}pt`;

          const { topAdj: newTopAdj, bottomAdj: newBottomAdj } = getBrowserVerticalFontAdjustments(
            fontKitFont,
            dynamicFontSize ?? schema.fontSize ?? DEFAULT_FONT_SIZE,
            schema.lineHeight ?? DEFAULT_LINE_HEIGHT,
            schema.verticalAlignment ?? DEFAULT_VERTICAL_ALIGNMENT
          );
          textBlock.style.paddingTop = `${newTopAdj}px`;
          textBlock.style.marginBottom = `${newBottomAdj}px`;
        })();
      }, 0);
    });
  }

  if (usePlaceholder) {
    textBlock.style.color = PLACEHOLDER_FONT_COLOR;
    textBlock.addEventListener('focus', () => {
      if (textBlock.innerText === placeholder) {
        textBlock.innerText = '';
        textBlock.style.color = schema.fontColor ?? DEFAULT_FONT_COLOR;
      }
    });
  }

  if (mode === 'designer') {
    setTimeout(() => {
      textBlock.focus();
      // Set the focus to the end of the editable element when you focus, as we would for a textarea
      const selection = window.getSelection();
      const range = document.createRange();
      if (selection && range) {
        range.selectNodeContents(textBlock);
        range.collapse(false); // Collapse range to the end
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    });
  }
};

export const buildStyledTextContainer = async (
  arg: UIRenderProps<RichTextSchema>,
  value: string
) => {
  const { schema, rootElement, mode, options, _cache } = arg;
  const font = options?.font || getDefaultFont();

  let dynamicFontSize: undefined | number = undefined;

  if (schema.dynamicFontSize && value) {
    dynamicFontSize = await calculateDynamicFontSize({
      textSchema: schema,
      font,
      value,
      startingFontSize: dynamicFontSize,
      _cache,
    });
  }

  const fontKitFont = await getFontKitFont(schema.fontName, font, _cache);
  // Depending on vertical alignment, we need to move the top or bottom of the font to keep
  // it within it's defined box and align it with the generated pdf.
  const { topAdj, bottomAdj } = getBrowserVerticalFontAdjustments(
    fontKitFont,
    dynamicFontSize ?? schema.fontSize ?? DEFAULT_FONT_SIZE,
    schema.lineHeight ?? DEFAULT_LINE_HEIGHT,
    schema.verticalAlignment ?? DEFAULT_VERTICAL_ALIGNMENT
  );

  const topAdjustment = topAdj.toString();
  const bottomAdjustment = bottomAdj.toString();

  const container = document.createElement('div');

  const containerStyle: CSS.Properties = {
    padding: 0,
    resize: 'none',
    backgroundColor: getBackgroundColor(value, schema),
    border: 'none',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: mapVerticalAlignToFlex(schema.verticalAlignment),
    width: '100%',
    height: '100%',
    cursor: isEditable(mode, schema) ? 'text' : 'default',
  };
  Object.assign(container.style, containerStyle);
  rootElement.innerHTML = '';
  rootElement.appendChild(container);

  // text decoration
  const textDecorations: string[] = [];
  // if (schema.strikethrough) textDecorations.push('line-through');
  // if (schema.underline) textDecorations.push('underline');

  const textBlockStyle: CSS.Properties = {
    // Font formatting styles
    fontFamily: schema.fontName ? `'${schema.fontName}'` : 'inherit',
    color: schema.fontColor ? schema.fontColor : DEFAULT_FONT_COLOR,
    fontSize: `${dynamicFontSize ?? schema.fontSize ?? DEFAULT_FONT_SIZE}pt`,
    letterSpacing: `${schema.characterSpacing ?? DEFAULT_CHARACTER_SPACING}pt`,
    lineHeight: `${schema.lineHeight ?? DEFAULT_LINE_HEIGHT}em`,
    textAlign: schema.alignment ?? DEFAULT_ALIGNMENT,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    // Block layout styles
    resize: 'none',
    border: 'none',
    outline: 'none',
    marginBottom: `${bottomAdjustment}px`,
    paddingTop: `${topAdjustment}px`,
    backgroundColor: 'transparent',
    textDecoration: textDecorations.join(' '),
  };

  const textBlock = document.createElement('div');
  textBlock.id = 'text-' + String(schema.id);
  Object.assign(textBlock.style, textBlockStyle);

  container.appendChild(textBlock);

  return textBlock;
};

// # new code ------------------------------------------------

function getCaret(element: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;

  // Capture cursor position
  const range = selection.getRangeAt(0);
  const preCursorRange = range.cloneRange();
  preCursorRange.selectNodeContents(element);
  preCursorRange.setEnd(range.startContainer, range.startOffset);
  return preCursorRange.toString().length;
}

const setCaret = (element: HTMLElement, cursorPosition: number) => {
  let childNodesLen = element.childNodes.length;
  let offset = 0;
  if (cursorPosition > childNodesLen - 1) {
    //if the cursor is at end span we write after the word else we write before the word
    cursorPosition = childNodesLen - 1;
    offset = 1;
  }
  var range = document.createRange(); // Create a new range object
  var selection = window.getSelection(); // Get the selection object
  if (!selection) return;
  if (childNodesLen === 0) {
    // if there are no child nodes
    range.setStart(element, 0);
  } else {
    range.setStart(element.childNodes[cursorPosition], offset); // Set the range start to the offset character in the nth child node
  }
  range.collapse(true); // Collapse the range to the start (placing the caret)

  selection.removeAllRanges(); // Clear any existing selections
  selection.addRange(range); // Add the new range to the selection
};

function restoreSelection(
  element: HTMLElement,
  selectionRange: { start: number; end: number } | null
) {
  if (!selectionRange) return;

  const { start, end } = selectionRange;
  if (start === -1 || end === -1) return;

  let nodeCount = 0;
  let nodeRange = document.createRange();
  let foundStartNode = false;
  let foundEndNode = false;

  const traverseNodesV2 = (nodes: NodeList) => {
    for (const node of nodes) {
      if (!foundStartNode && nodeCount + 1 > start) {
        nodeRange.setStart(node, start - nodeCount);
        foundStartNode = true;
      }
      if (!foundEndNode && nodeCount + 1 >= end) {
        nodeRange.setEnd(node, end - nodeCount);
        foundEndNode = true;
      }
      // consideration made that each node will have only one letter
      nodeCount++;
      if (foundStartNode && foundEndNode) break;
    }
  };
  traverseNodesV2(element.childNodes);

  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(nodeRange);
  }
}

function handleSchemaBasedIncDec(
  schema: RichTextSchema,
  richTextLetter: RichTextLetter,
  property: 'fontSize' | 'lineHeight' | 'characterSpacing' | 'opacity' | 'characterSpacing',
  styles: Pick<
    RichTextLetterStyleHandler,
    'fontSize' | 'lineHeight' | 'characterSpacing' | 'opacity' | 'characterSpacing'
  >,
  modifiedStyles: RichTextLetterStyle
) {
  const DEFAULTS = {
    fontSize: DEFAULT_FONT_SIZE,
    lineHeight: DEFAULT_LINE_HEIGHT,
    characterSpacing: DEFAULT_CHARACTER_SPACING,
    opacity: DEFAULT_OPACITY,
  };
  if (!styles[property]) return modifiedStyles;

  const value = styles[property];

  let oldValue = richTextLetter.style[property] || schema[property] || DEFAULTS[property];
  let newValue: number | undefined = undefined;
  if (typeof value === 'object' && value?.op === 'inc') {
    newValue = oldValue + value.value;
    if (property === 'opacity') {
      newValue = Math.min(newValue, 1);
    }
  } else if (typeof value === 'object' && value?.op === 'dec') {
    newValue = oldValue - value.value;
    // since no value can be less than 0
    newValue = Math.max(newValue, 0);
  } else if (typeof value === 'number') {
    newValue = value;
  }

  modifiedStyles[property] = newValue;
}

function changeStyleOfSelection(
  element: HTMLElement,
  styles: RichTextLetterStyleHandler,
  schema: RichTextSchema,
  _cache: Map<any, any>
) {
  const selectionRange: { start: number; end: number } = { start: -1, end: -1 };

  const selection = window.getSelection();
  if (!selection?.rangeCount) return;

  const cursorPosition = getCaret(element) || 0;
  selectionRange.start = cursorPosition;

  const range = selection.getRangeAt(0);
  const selectedNodes = range.cloneContents();

  const richTextLetters = editableHtml2RichTextLetters(element, schema2RichTextLetterStyle(schema));
  let maxIdx = -1;
  for (let node of selectedNodes.childNodes) {
    let nodeElement = node as HTMLElement;
    let idx = -1;

    // getting selection index
    // text node handling for selecting one word
    if (nodeElement.nodeType === Node.TEXT_NODE) {
      idx = cursorPosition;
    }
    if (nodeElement.nodeType === Node.ELEMENT_NODE && nodeElement.tagName === 'SPAN') {
      let idxStr = nodeElement.getAttribute('data-rtl-idx');
      idx = idxStr ? parseInt(idxStr) : -1;
    }

    // modifying styles
    if (idx >= 0 && idx < richTextLetters.length) {
      maxIdx = Math.max(maxIdx, idx);
      let modifiedStyles: RichTextLetterStyle = {};
      const fontName =
        parseFontName({
          fontName: richTextLetters[idx].style.fontName,
          _cache,
          options: { bold: styles.bold, italic: styles.italic },
        }) || styles.fontName;
      modifiedStyles.fontName = fontName;

      handleSchemaBasedIncDec(schema, richTextLetters[idx], 'fontSize', styles, modifiedStyles);
      handleSchemaBasedIncDec(
        schema,
        richTextLetters[idx],
        'characterSpacing',
        styles,
        modifiedStyles
      );
      handleSchemaBasedIncDec(schema, richTextLetters[idx], 'lineHeight', styles, modifiedStyles);
      handleSchemaBasedIncDec(schema, richTextLetters[idx], 'opacity', styles, modifiedStyles);
      handleSchemaBasedIncDec(
        schema,
        richTextLetters[idx],
        'characterSpacing',
        styles,
        modifiedStyles
      );

      if (styles.fontColor) {
        if (styles.fontColor === 'reset') {
          modifiedStyles.fontColor = schema.fontColor;
        } else {
          modifiedStyles.fontColor = styles.fontColor;
        }
      }

      if (styles.backgroundColor) {
        if (styles.backgroundColor === 'reset') {
          modifiedStyles.backgroundColor = undefined;
        } else {
          modifiedStyles.backgroundColor = styles.backgroundColor;
        }
      }

      if (styles.underline) {
        modifiedStyles.underline = !richTextLetters?.[idx]?.style?.underline;
      }
      if (styles.strikethrough) {
        modifiedStyles.strikethrough = !richTextLetters?.[idx]?.style?.strikethrough;
      }

      richTextLetters[idx].style = { ...richTextLetters[idx].style, ...modifiedStyles };
    }
  }
  selectionRange.end = maxIdx + 1;

  element.innerHTML = richTextLetters2Html(richTextLetters);
  // todo : replace selection with new html
  // setCaret(element, cursorPosition);
  restoreSelection(element, selectionRange);
}

// # new code ------------------------------------------------

/**
 * Firefox doesn't support 'plaintext-only' contentEditable mode, which we want to avoid mark-up.
 * This function adds a workaround for Firefox to make the contentEditable element behave like 'plaintext-only'.
 */
const SHORTCUTS_MAP: {
  baseKeys: ('ctrlKey' | 'shiftKey' | 'altKey')[];
  mod: string;
  config: RichTextLetterStyleHandler;
  prevDef: boolean;
}[] = [
  // ! implement ctrl + z and ctrl + y
  { baseKeys: ['ctrlKey'], mod: 'b', config: { bold: true }, prevDef: true },
  { baseKeys: ['ctrlKey'], mod: 'i', config: { italic: true }, prevDef: true },
  { baseKeys: ['ctrlKey'], mod: 'u', config: { underline: true }, prevDef: true },
  { baseKeys: ['ctrlKey'], mod: 'k', config: { strikethrough: true }, prevDef: true },
  {
    baseKeys: ['ctrlKey'],
    mod: '1',
    config: { fontSize: { op: 'inc', value: 1 } },
    prevDef: true,
  },
  {
    baseKeys: ['ctrlKey'],
    mod: '2',
    config: { fontSize: { op: 'dec', value: 1 } },
    prevDef: true,
  },
  { baseKeys: ['ctrlKey'], mod: '3', config: { fontColor: 'reset' }, prevDef: true },
  { baseKeys: ['ctrlKey'], mod: '4', config: { fontColor: '#991111' }, prevDef: true },
  { baseKeys: ['ctrlKey'], mod: '5', config: { fontColor: '#119911' }, prevDef: true },
  { baseKeys: ['ctrlKey'], mod: '6', config: { fontColor: '#111199' }, prevDef: true },
  { baseKeys: ['ctrlKey'], mod: '7', config: { backgroundColor: '#ff8888' }, prevDef: true },
  { baseKeys: ['ctrlKey'], mod: '8', config: { backgroundColor: '#88ff88' }, prevDef: true },
  { baseKeys: ['ctrlKey'], mod: '9', config: { backgroundColor: '#8888ff' }, prevDef: true },
  { baseKeys: ['ctrlKey'], mod: '0', config: { backgroundColor: 'reset' }, prevDef: true },
  {
    baseKeys: ['altKey'],
    mod: '1',
    config: { opacity: { op: 'inc', value: 0.1 } },
    prevDef: true,
  },
  {
    baseKeys: ['altKey'],
    mod: '2',
    config: { opacity: { op: 'dec', value: 0.1 } },
    prevDef: true,
  },
  {
    baseKeys: ['altKey'],
    mod: '3',
    config: { characterSpacing: { op: 'inc', value: 1 } },
    prevDef: true,
  },
  {
    baseKeys: ['altKey'],
    mod: '4',
    config: { characterSpacing: { op: 'dec', value: 1 } },
    prevDef: true,
  },
  {
    baseKeys: ['altKey'],
    mod: '5',
    config: { lineHeight: { op: 'inc', value: 0.1 } },
    prevDef: true,
  },
  {
    baseKeys: ['altKey'],
    mod: '6',
    config: { lineHeight: { op: 'dec', value: 0.1 } },
    prevDef: true,
  },
];

export const makeElementPlainTextContentEditable = (arg: {
  element: HTMLElement;
  schema: RichTextSchema;
  _cache: Map<any, any>;
}) => {
  const { element, schema, _cache } = arg;
  // if (!isFirefox()) {
  //   element.contentEditable = 'plaintext-only';
  //   return;
  // }

  element.contentEditable = 'true';

  // this handles cursor position and conversion of html to rich text letters to again formatted span tags
  element.addEventListener('input', (e: Event) => {
    const cursorPosition = getCaret(element) || 0;
    const updatedHtml = richTextLetters2Html(
      editableHtml2RichTextLetters(element, schema2RichTextLetterStyle(schema))
    );
    element.innerHTML = updatedHtml;
    setCaret(element, cursorPosition);
  });

  // shortcut key handling + rich text handling
  element.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.execCommand('insertLineBreak', false, undefined);
    }

    for (const shortcut of SHORTCUTS_MAP) {
      if (shortcut.baseKeys.every((key) => e[key]) && e.key === shortcut.mod) {
        if (shortcut.prevDef) e.preventDefault();
        changeStyleOfSelection(element, shortcut.config, schema, _cache);
      }
    }
  });

  // Todo : paste handling [can do rich text handling here later]
  element.addEventListener('paste', (e: ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData?.getData('text');
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    selection.deleteFromDocument();
    selection.getRangeAt(0).insertNode(document.createTextNode(paste || ''));
    selection.collapseToEnd();
  });
};

export const mapVerticalAlignToFlex = (verticalAlignmentValue: string | undefined) => {
  switch (verticalAlignmentValue) {
    case VERTICAL_ALIGN_TOP:
      return 'flex-start';
    case VERTICAL_ALIGN_MIDDLE:
      return 'center';
    case VERTICAL_ALIGN_BOTTOM:
      return 'flex-end';
  }
  return 'flex-start';
};

export const getBackgroundColor = (value: string, schema: { backgroundColor?: string }) => {
  if (!value || !schema.backgroundColor) return 'transparent';
  return schema.backgroundColor;
};
