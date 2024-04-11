import type * as CSS from 'csstype';
import { UIRenderProps, Schema, getDefaultFont } from '@pdfme/common';
import type { TextSchema } from './types';
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

const mapVerticalAlignToFlex = (verticalAlignmentValue: string | undefined) => {
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

const getBackgroundColor = (value: string, schema: Schema) => {
  if (!value || !schema.backgroundColor) return 'transparent';
  return schema.backgroundColor as string;
};

export const uiRender = async (arg: UIRenderProps<TextSchema>) => {
  const {
    value,
    schema,
    rootElement,
    mode,
    onChange,
    stopEditing,
    tabIndex,
    placeholder,
    options,
    _cache,
  } = arg;
  const font = options?.font || getDefaultFont();

  let dynamicFontSize: undefined | number = undefined;
  const getCdfArg = (v: string) => ({
    textSchema: schema,
    font,
    value: v,
    startingFontSize: dynamicFontSize,
    _cache,
  });
  if (schema.dynamicFontSize && value) {
    dynamicFontSize = await calculateDynamicFontSize(getCdfArg(value));
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
  };
  const textBlock = document.createElement('div');
  Object.assign(textBlock.style, textBlockStyle);

  if (isEditable(mode, schema)) {
    if (!isFirefox()) {
      textBlock.contentEditable = 'plaintext-only';
    } else {
      textBlock.contentEditable = 'true';
      textBlock.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          document.execCommand('insertLineBreak', false, undefined);
        }
      });

      textBlock.addEventListener('paste', (e: ClipboardEvent) => {
        e.preventDefault();
        const paste = e.clipboardData?.getData('text');
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;
        selection.deleteFromDocument();
        selection.getRangeAt(0).insertNode(document.createTextNode(paste || ''));
        selection.collapseToEnd();
      });
    }
    textBlock.tabIndex = tabIndex || 0;
    textBlock.innerText = value;
    textBlock.addEventListener('blur', (e: Event) => {
      onChange && onChange({ key: 'content', value: (e.target as HTMLDivElement).innerText });
      stopEditing && stopEditing();
    });

    if (schema.dynamicFontSize) {
      textBlock.addEventListener('keyup', () => {
        setTimeout(() => {
          void (async () => {
            if (!textBlock.textContent) return;
            dynamicFontSize = await calculateDynamicFontSize(getCdfArg(textBlock.textContent));
            textBlock.style.fontSize = `${dynamicFontSize}pt`;

            const { topAdj: newTopAdj, bottomAdj: newBottomAdj } =
              getBrowserVerticalFontAdjustments(
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

    if (placeholder && !value) {
      textBlock.innerText = placeholder;
      textBlock.style.color = PLACEHOLDER_FONT_COLOR;
      if (schema.dynamicFontSize) {
        const fontSize = await calculateDynamicFontSize(getCdfArg(placeholder));
        textBlock.style.fontSize = `${fontSize}pt`;
      }
      textBlock.addEventListener('focus', () => {
        if (textBlock.innerText === placeholder) {
          textBlock.innerText = '';
          textBlock.style.color = schema.fontColor ?? DEFAULT_FONT_COLOR;
        }
      });
    }

    container.appendChild(textBlock);

    if (mode === 'designer') {
      setTimeout(() => {
        textBlock.focus();
        // Set the focus to the end of the editable element when you focus, as we would for a textarea
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(textBlock);
        range.collapse(false); // Collapse range to the end
        selection?.removeAllRanges();
        selection?.addRange(range);
      });
    }
  } else {
    textBlock.innerHTML = value
      .split('')
      .map(
        (l: string, i: number) =>
          `<span style="letter-spacing:${
            String(value).length === i + 1 ? 0 : 'inherit'
          };">${l}</span>`
      )
      .join('');

    container.appendChild(textBlock);
  }
};
