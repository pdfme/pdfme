import type * as CSS from 'csstype';
import type { Font as FontKitFont } from 'fontkit';
import {
  UIRenderProps,
  getDefaultFont,
  getInternalLinkTarget,
  mm2pt,
  normalizeLinkHref,
} from '@pdfme/common';
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
  CODE_BACKGROUND_COLOR,
  SYNTHETIC_BOLD_CSS_TEXT_SHADOW,
  TEXT_FORMAT_INLINE_MARKDOWN,
} from './constants.js';
import {
  calculateDynamicFontSize,
  getFontKitFont,
  getBrowserVerticalFontAdjustments,
  isFirefox,
  splitTextToSize,
} from './helper.js';
import { parseInlineMarkdown, stripInlineMarkdown } from './inlineMarkdown.js';
import { applyTextLineRange, plainTextLinesToValue } from './measure.js';
import { shouldUseDynamicFontSize } from './overflow.js';
import {
  calculateDynamicRichTextFontSize,
  isInlineMarkdownTextSchema,
  layoutRichTextLines,
  resolveRichTextRuns,
} from './richText.js';
import { isEditable } from '../utils.js';
import { getTextLineRange } from '../splitRange.js';
import { getBoxContentArea, getBoxInsets, hasBoxDimension } from '../box.js';

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

      return Array.from(segment)
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
  const {
    value,
    schema,
    basePdf,
    mode,
    onChange,
    stopEditing,
    tabIndex,
    placeholder,
    options,
    _cache,
  } = arg;
  const hasInlineMarkdownFormat = schema.textFormat === TEXT_FORMAT_INLINE_MARKDOWN;
  const enableInlineMarkdown = isInlineMarkdownTextSchema(schema);
  const isReadOnlySplitInlineMarkdownFormChunk =
    mode === 'form' && Boolean(getTextLineRange(schema)) && hasInlineMarkdownFormat;
  const renderInlineMarkdownReadOnlyChunk =
    enableInlineMarkdown || isReadOnlySplitInlineMarkdownFormChunk;
  const editable = isEditable(mode, schema) && !isReadOnlySplitInlineMarkdownFormChunk;
  const usePlaceholder = editable && placeholder && !value;
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
  const enableDynamicFontSize = shouldUseDynamicFontSize(schema, basePdf);
  const displayValue = enableInlineMarkdown ? stripInlineMarkdown(value) : value;
  const dynamicRichTextFontSize =
    enableInlineMarkdown && enableDynamicFontSize
      ? await calculateDynamicRichTextFontSize({
          value: usePlaceholder ? (placeholder as string) : value,
          schema,
          font,
          _cache,
        })
      : undefined;
  const textBlock = buildStyledTextContainer(
    isReadOnlySplitInlineMarkdownFormChunk ? { ...arg, mode: 'viewer' } : arg,
    fontKitFont,
    usePlaceholder ? placeholder : displayValue,
    dynamicRichTextFontSize,
  );

  const processedText = replaceUnsupportedChars(
    getRangedPlainTextValue({
      value,
      schema,
      fontKitFont,
      fontSize: schema.fontSize ?? DEFAULT_FONT_SIZE,
    }),
    fontKitFont,
  );

  if (!editable) {
    if (renderInlineMarkdownReadOnlyChunk) {
      await renderInlineMarkdownReadOnly({
        textBlock,
        value,
        schema,
        font,
        _cache,
      });
      return;
    }

    // Read-only mode
    textBlock.innerHTML = processedText
      .split('')
      .map((l, i) => {
        const escaped = l
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
        return `<span style="letter-spacing:${
          String(value).length === i + 1 ? 0 : 'inherit'
        };">${escaped}</span>`;
      })
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

  if (enableDynamicFontSize) {
    let dynamicFontSize: undefined | number = undefined;

    textBlock.addEventListener('keyup', () => {
      setTimeout(() => {
        // Use a regular function instead of an async one since we don't need await
        (() => {
          if (!textBlock.textContent) return;
          dynamicFontSize = calculateDynamicFontSize({
            textSchema: schema,
            fontKitFont,
            value: isInlineMarkdownTextSchema(schema)
              ? stripInlineMarkdown(getText(textBlock))
              : getText(textBlock),
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

const renderInlineMarkdownReadOnly = async (arg: {
  textBlock: HTMLDivElement;
  value: string;
  schema: TextSchema;
  font: NonNullable<UIRenderProps<TextSchema>['options']['font']>;
  _cache: Map<string | number, unknown>;
}) => {
  const { textBlock, value, schema, font, _cache } = arg;
  const runs = await resolveRichTextRuns({
    runs: parseInlineMarkdown(value),
    schema,
    font,
    _cache,
  });
  const lineRange = getTextLineRange(schema);
  if (lineRange) {
    const lines = applyTextLineRange(
      layoutRichTextLines({
        runs,
        fontSize: schema.fontSize ?? DEFAULT_FONT_SIZE,
        characterSpacing: schema.characterSpacing ?? DEFAULT_CHARACTER_SPACING,
        boxWidthInPt: mm2pt(getBoxContentArea(schema).width),
      }),
      lineRange,
    );

    textBlock.innerHTML = '';
    lines.forEach((line, lineIndex) => {
      line.runs.forEach((run) => {
        appendInlineMarkdownRun({ textBlock, run, schema, font });
      });
      if (lineIndex < lines.length - 1) textBlock.appendChild(document.createElement('br'));
    });
    return;
  }

  textBlock.innerHTML = '';
  runs.forEach((run) => {
    appendInlineMarkdownRun({ textBlock, run, schema, font });
  });
};

const appendInlineMarkdownRun = (arg: {
  textBlock: HTMLDivElement;
  run: Awaited<ReturnType<typeof resolveRichTextRuns>>[number];
  schema: TextSchema;
  font: NonNullable<UIRenderProps<TextSchema>['options']['font']>;
}) => {
  const { textBlock, run, schema, font } = arg;
  const href = run.href ? normalizeLinkHref(run.href) : undefined;
  const span = href ? document.createElement('a') : document.createElement('span');
  const processedText = replaceUnsupportedChars(run.text, run.fontKitFont);
  const textDecorations: string[] = [];

  span.textContent = processedText;
  if (href) {
    const anchor = span as HTMLAnchorElement;
    anchor.href = href;
    if (!getInternalLinkTarget(href)) {
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
    }
    textDecorations.push('underline');
  }
  if (run.fontName) {
    span.style.fontFamily = `'${run.fontName}'`;
  }
  if (run.syntheticBold) {
    span.style.fontWeight = '800';
    span.style.textShadow = SYNTHETIC_BOLD_CSS_TEXT_SHADOW;
  }
  if (run.syntheticItalic) {
    span.style.fontStyle = 'italic';
  }
  if (run.strikethrough) {
    textDecorations.push('line-through');
  }
  if (textDecorations.length > 0) {
    span.style.textDecoration = textDecorations.join(' ');
  }
  if (run.code) {
    span.style.backgroundColor = CODE_BACKGROUND_COLOR;
    span.style.borderRadius = '2px';
    span.style.padding = '0 0.15em';
    if (!schema.fontVariants?.code || !font[schema.fontVariants.code]) {
      span.style.fontFamily = run.fontName ? `'${run.fontName}', monospace` : 'monospace';
    }
  }
  textBlock.appendChild(span);
};

const getRangedPlainTextValue = (arg: {
  value: string;
  schema: TextSchema;
  fontKitFont: FontKitFont;
  fontSize: number;
}) => {
  const { value, schema, fontKitFont, fontSize } = arg;
  const lineRange = getTextLineRange(schema);
  if (!lineRange) return value;

  const lines = applyTextLineRange(
    splitTextToSize({
      value,
      characterSpacing: schema.characterSpacing ?? DEFAULT_CHARACTER_SPACING,
      fontSize,
      fontKitFont,
      boxWidthInPt: mm2pt(getBoxContentArea(schema).width),
    }),
    lineRange,
  );
  return plainTextLinesToValue(lines);
};

export const buildStyledTextContainer = (
  arg: UIRenderProps<TextSchema>,
  fontKitFont: FontKitFont,
  value: string,
  resolvedDynamicFontSize?: number,
) => {
  const { schema, rootElement, mode } = arg;

  let dynamicFontSize: undefined | number = resolvedDynamicFontSize;
  const characterSpacing = schema.characterSpacing ?? DEFAULT_CHARACTER_SPACING;
  const editable = isEditable(mode, schema);

  if (dynamicFontSize === undefined && shouldUseDynamicFontSize(schema, arg.basePdf) && value) {
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
  const verticalAlignment = schema.verticalAlignment ?? DEFAULT_VERTICAL_ALIGNMENT;
  const isTopAligned = verticalAlignment === VERTICAL_ALIGN_TOP;

  const container = document.createElement('div');
  const { borderWidth, padding } = getBoxInsets(schema);
  const hasPadding = hasBoxDimension(schema.padding);
  const hasBorder = Boolean(schema.borderColor && hasBoxDimension(schema.borderWidth));

  const containerStyle: CSS.Properties = {
    padding: hasPadding
      ? `${padding.top}mm ${padding.right}mm ${padding.bottom}mm ${padding.left}mm`
      : 0,
    resize: 'none',
    backgroundColor: getBackgroundColor(schema),
    border: hasBorder ? undefined : 'none',
    ...(hasBorder
      ? {
          borderTopWidth: `${borderWidth.top}mm`,
          borderRightWidth: `${borderWidth.right}mm`,
          borderBottomWidth: `${borderWidth.bottom}mm`,
          borderLeftWidth: `${borderWidth.left}mm`,
          borderStyle: 'solid',
          borderColor: schema.borderColor,
        }
      : {}),
    ...(hasPadding || hasBorder ? { boxSizing: 'border-box' } : {}),
    display: 'flex',
    flexDirection: 'column',
    justifyContent: mapVerticalAlignToFlex(verticalAlignment),
    width: '100%',
    height: '100%',
    cursor: editable ? 'text' : 'default',
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
    letterSpacing: `${characterSpacing}pt`,
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
    // Browsers include the final letter-spacing in editable text wrapping, unlike PDF rendering.
    ...(editable && characterSpacing > 0 ? { width: `calc(100% + ${characterSpacing}pt)` } : {}),
    ...(isTopAligned ? { height: '100%' } : {}),
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

const getBackgroundColor = (schema: { backgroundColor?: string }) => {
  if (!schema.backgroundColor) return 'transparent';
  return schema.backgroundColor;
};
