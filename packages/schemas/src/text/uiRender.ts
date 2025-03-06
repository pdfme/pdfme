import type * as CSS from 'csstype';
import type { Font as FontKitFont } from 'fontkit';
import { UIRenderProps, getDefaultFont } from '@pdfme/common';
import type { TextSchema } from './types.js';
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
} from './helper.js';
import { isEditable } from '../utils.js';

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

export const uiRender = async (arg: UIRenderProps<TextSchema>) => {
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
  const fontKitFont = await getFontKitFont(
    schema.fontName,
    font,
    _cache as Map<string, import('fontkit').Font>,
  );
  const textBlock = buildStyledTextContainer(
    arg,
    fontKitFont,
    usePlaceholder ? placeholder : value,
  );

  const processedText = replaceUnsupportedChars(value, fontKitFont);

  if (!isEditable(mode, schema)) {
    // Read-only mode
    textBlock.innerHTML = processedText
      .split('')
      .map(
        (l, i) =>
          `<span style="letter-spacing:${
            String(value).length === i + 1 ? 0 : 'inherit'
          };">${l}</span>`,
      )
      .join('');
    return;
  }

  makeElementPlainTextContentEditable(textBlock);
  textBlock.tabIndex = tabIndex || 0;
  textBlock.innerText = mode === 'designer' ? value : processedText;
  textBlock.addEventListener('blur', (e: Event) => {
    if (onChange) onChange({ key: 'content', value: getText(e.target as HTMLDivElement) });
    if (stopEditing) stopEditing();
  });

  if (schema.dynamicFontSize) {
    let dynamicFontSize: undefined | number = undefined;

    textBlock.addEventListener('keyup', () => {
      setTimeout(() => {
        // Use a regular function instead of an async one since we don't need await
        (() => {
          if (!textBlock.textContent) return;
          dynamicFontSize = calculateDynamicFontSize({
            textSchema: schema,
            fontKitFont,
            value: getText(textBlock),
            startingFontSize: dynamicFontSize,
          });
          textBlock.style.fontSize = `${dynamicFontSize}pt`;

          const { topAdj: newTopAdj, bottomAdj: newBottomAdj } = getBrowserVerticalFontAdjustments(
            fontKitFont,
            dynamicFontSize ?? schema.fontSize ?? DEFAULT_FONT_SIZE,
            schema.lineHeight ?? DEFAULT_LINE_HEIGHT,
            schema.verticalAlignment ?? DEFAULT_VERTICAL_ALIGNMENT,
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

export const buildStyledTextContainer = (
  arg: UIRenderProps<TextSchema>,
  fontKitFont: FontKitFont,
  value: string,
) => {
  const { schema, rootElement, mode } = arg;

  let dynamicFontSize: undefined | number = undefined;

  if (schema.dynamicFontSize && value) {
    dynamicFontSize = calculateDynamicFontSize({
      textSchema: schema,
      fontKitFont,
      value,
      startingFontSize: dynamicFontSize,
    });
  }

  // Depending on vertical alignment, we need to move the top or bottom of the font to keep
  // it within it's defined box and align it with the generated pdf.
  const { topAdj, bottomAdj } = getBrowserVerticalFontAdjustments(
    fontKitFont,
    dynamicFontSize ?? schema.fontSize ?? DEFAULT_FONT_SIZE,
    schema.lineHeight ?? DEFAULT_LINE_HEIGHT,
    schema.verticalAlignment ?? DEFAULT_VERTICAL_ALIGNMENT,
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
  const textDecorations = [];
  if (schema.strikethrough) textDecorations.push('line-through');
  if (schema.underline) textDecorations.push('underline');

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

/**
 * Firefox doesn't support 'plaintext-only' contentEditable mode, which we want to avoid mark-up.
 * This function adds a workaround for Firefox to make the contentEditable element behave like 'plaintext-only'.
 */
export const makeElementPlainTextContentEditable = (element: HTMLElement) => {
  if (!isFirefox()) {
    element.contentEditable = 'plaintext-only';
    return;
  }

  element.contentEditable = 'true';
  element.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.execCommand('insertLineBreak', false, undefined);
    }
  });

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

const getBackgroundColor = (value: string, schema: { backgroundColor?: string }) => {
  if (!value || !schema.backgroundColor) return 'transparent';
  return schema.backgroundColor;
};
