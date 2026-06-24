import { Bold, Code, Italic, Link, Strikethrough } from 'lucide';
import type { UIRenderProps } from '@pdfme/common';
import { createSvgStr } from '../utils.js';
import { escapeInlineMarkdown, parseInlineMarkdown } from './inlineMarkdown.js';
import type { RichTextRun, TextSchema } from './types.js';

type UITheme = UIRenderProps<TextSchema>['theme'];

// Floating toolbar for the Designer that wraps/unwraps the textarea selection with markdown syntax.

// A boolean style on RichTextRun that maps to a symmetric markdown delimiter.
type StyleKey = 'bold' | 'italic' | 'strikethrough' | 'code';

type Styles = Record<StyleKey, boolean>;

type InlineFormat = {
  style: StyleKey;
  delimiter: string;
  // Wrapping order, innermost first. Code must stay innermost; bold/italic adjacent so their
  // "*" delimiters merge into "***". A new format only needs a rank relative to these.
  nestRank: number;
  i18nKey: string;
  fallbackLabel: string;
  icon: string;
};

// Add a new inline format here (plus its StyleKey + RichTextRun field) and the toolbar, delimiter
// detection, active-state and markdown emission all pick it up automatically.
const INLINE_FORMATS: InlineFormat[] = [
  { style: 'bold', delimiter: '**', nestRank: 1, i18nKey: 'schemas.text.bold', fallbackLabel: 'Bold', icon: createSvgStr(Bold) }, // prettier-ignore
  { style: 'italic', delimiter: '*', nestRank: 2, i18nKey: 'schemas.text.italic', fallbackLabel: 'Italic', icon: createSvgStr(Italic) }, // prettier-ignore
  { style: 'strikethrough', delimiter: '~~', nestRank: 3, i18nKey: 'schemas.text.strikethrough', fallbackLabel: 'Strikethrough', icon: createSvgStr(Strikethrough) }, // prettier-ignore
  { style: 'code', delimiter: '`', nestRank: 0, i18nKey: 'schemas.text.code', fallbackLabel: 'Code', icon: createSvgStr(Code) }, // prettier-ignore
];

const LINK_ICON = createSvgStr(Link);

const DELIMITER_CHARS = new Set(INLINE_FORMATS.flatMap((format) => [...format.delimiter]));
const EMIT_ORDER = [...INLINE_FORMATS].sort((a, b) => a.nestRank - b.nestRank);

const runStyles = (run: RichTextRun): Styles =>
  Object.fromEntries(INLINE_FORMATS.map((format) => [format.style, Boolean(run[format.style])])) as Styles; // prettier-ignore

const emitStyledMarkdown = (core: string, styles: Styles) => {
  let result = core;
  EMIT_ORDER.forEach((format) => {
    if (styles[format.style]) result = `${format.delimiter}${result}${format.delimiter}`;
  });
  return result;
};

const TOOLBAR_GAP = 8;

// Full property set so the mirror's box model matches the textarea exactly (avoids per-line drift).
const CARET_STYLE_PROPS = [
  'direction',
  'boxSizing',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
];

// Mirror-div measurement of a textarea caret position (textareas expose no selection rect).
const getCaretCoordinates = (textarea: HTMLTextAreaElement, position: number) => {
  const computed = window.getComputedStyle(textarea);
  const div = document.createElement('div');
  const divStyle = div.style as unknown as Record<string, string>;
  const computedRecord = computed as unknown as Record<string, string>;
  CARET_STYLE_PROPS.forEach((prop) => {
    divStyle[prop] = computedRecord[prop];
  });
  divStyle.position = 'absolute';
  divStyle.visibility = 'hidden';
  divStyle.whiteSpace = 'pre-wrap';
  divStyle.wordWrap = 'break-word';
  div.textContent = textarea.value.slice(0, position);
  const marker = document.createElement('span');
  marker.textContent = textarea.value.slice(position) || '.';
  div.appendChild(marker);
  document.body.appendChild(div);
  const top = marker.offsetTop + parseFloat(computed.borderTopWidth || '0');
  const left = marker.offsetLeft + parseFloat(computed.borderLeftWidth || '0');
  const lineHeight = parseFloat(computed.lineHeight) || parseFloat(computed.fontSize);
  document.body.removeChild(div);
  return { top, left, lineHeight };
};

type AttachArg = {
  textarea: HTMLTextAreaElement;
  i18n: (key: string) => string;
  theme: UITheme;
};

let activeToolbar: { toolbar: HTMLDivElement; destroy: () => void } | null = null;

export const attachInlineMarkdownToolbar = (arg: AttachArg) => {
  const { textarea, i18n, theme } = arg;

  activeToolbar?.destroy();

  const label = (key: string, fallback: string) => i18n(key) || fallback;

  const toolbar = document.createElement('div');
  Object.assign(toolbar.style, {
    position: 'fixed',
    zIndex: '9999',
    display: 'none',
    alignItems: 'center',
    gap: '2px',
    padding: '3px',
    background: theme.colorWhite || '#ffffff',
    border: '1px solid rgba(0, 0, 0, 0.12)',
    borderRadius: '6px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.18)',
    boxSizing: 'border-box',
    userSelect: 'none',
  } satisfies Partial<CSSStyleDeclaration>);
  // Keep the textarea focused and its selection alive when a button is pressed.
  toolbar.addEventListener('mousedown', (e) => e.preventDefault());

  const hide = () => {
    toolbar.style.display = 'none';
  };

  // Parse the selection together with any delimiters touching it, so combined formats like
  // "***foo***" resolve to a single run carrying every active style.
  const getContext = () => {
    const { selectionStart: start, selectionEnd: end, value } = textarea;
    if (start === end) return null;
    let outerStart = start;
    while (outerStart > 0 && DELIMITER_CHARS.has(value[outerStart - 1])) outerStart -= 1;
    let outerEnd = end;
    while (outerEnd < value.length && DELIMITER_CHARS.has(value[outerEnd])) outerEnd += 1;
    const runs = parseInlineMarkdown(value.slice(outerStart, outerEnd));
    return { start, end, value, selected: value.slice(start, end), outerStart, outerEnd, runs };
  };

  const replaceRange = (from: number, to: number, text: string, selectFrom: number) => {
    textarea.value = `${textarea.value.slice(0, from)}${text}${textarea.value.slice(to)}`;
    textarea.setSelectionRange(selectFrom, selectFrom + text.length);
    textarea.focus();
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    refresh();
  };

  const applyFormat = (format: InlineFormat) => {
    const context = getContext();
    if (!context) return;
    const { start, end, selected, outerStart, outerEnd, runs } = context;

    if (runs.length === 1 && !runs[0].href) {
      const target = runStyles(runs[0]);
      target[format.style] = !target[format.style];
      replaceRange(outerStart, outerEnd, emitStyledMarkdown(runs[0].text, target), outerStart);
      return;
    }

    replaceRange(start, end, `${format.delimiter}${selected}${format.delimiter}`, start);
  };

  const applyLink = () => {
    const { selectionStart: start, selectionEnd: end, value } = textarea;
    if (start === end) return;
    const selected = value.slice(start, end);
    const url = window.prompt(label('schemas.text.linkUrlPrompt', 'Enter URL'), 'https://');
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed) return;
    const labelText = escapeInlineMarkdown(selected || trimmed);
    const markdown = `[${labelText}](${escapeInlineMarkdown(trimmed)})`;
    textarea.value = `${value.slice(0, start)}${markdown}${value.slice(end)}`;
    textarea.setSelectionRange(start + 1, start + 1 + labelText.length);
    textarea.focus();
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    refresh();
  };

  const positionToolbar = () => {
    const rect = textarea.getBoundingClientRect();
    // The Designer canvas is CSS-scaled (zoom); caret offsets are measured unscaled, so scale them.
    const scaleX = textarea.offsetWidth ? rect.width / textarea.offsetWidth : 1;
    const scaleY = textarea.offsetHeight ? rect.height / textarea.offsetHeight : 1;
    const startCaret = getCaretCoordinates(textarea, textarea.selectionStart);
    const endCaret = getCaretCoordinates(textarea, textarea.selectionEnd);
    const sameLine = Math.abs(startCaret.top - endCaret.top) < 1;
    const anchorTop = rect.top + (startCaret.top - textarea.scrollTop) * scaleY;
    const anchorLeft = sameLine
      ? rect.left + ((startCaret.left + endCaret.left) / 2 - textarea.scrollLeft) * scaleX
      : rect.left + (startCaret.left - textarea.scrollLeft) * scaleX;

    toolbar.style.visibility = 'hidden';
    toolbar.style.display = 'flex';
    const toolbarRect = toolbar.getBoundingClientRect();
    let top = anchorTop - toolbarRect.height - TOOLBAR_GAP;
    if (top < 4) top = anchorTop + startCaret.lineHeight * scaleY + TOOLBAR_GAP;
    let left = anchorLeft - toolbarRect.width / 2;
    left = Math.max(4, Math.min(left, window.innerWidth - toolbarRect.width - 4));
    toolbar.style.top = `${top}px`;
    toolbar.style.left = `${left}px`;
    toolbar.style.visibility = 'visible';
  };

  const ACTIVE_BG = theme.colorPrimaryBg || '#e6f4ff';
  const ACTIVE_COLOR = theme.colorPrimary || '#1677ff';
  const HOVER_BG = 'rgba(0, 0, 0, 0.06)';
  const IDLE_COLOR = '#333333';

  const setButtonActive = (el: HTMLButtonElement, active: boolean) => {
    el.dataset.active = active ? '1' : '0';
    el.style.background = active ? ACTIVE_BG : 'transparent';
    el.style.color = active ? ACTIVE_COLOR : IDLE_COLOR;
  };

  const createButton = (title: string, icon: string, onClick: () => void) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.innerHTML = icon;
    el.title = title;
    el.setAttribute('aria-label', title);
    el.dataset.active = '0';
    Object.assign(el.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '28px',
      height: '28px',
      padding: '0',
      border: 'none',
      borderRadius: '4px',
      background: 'transparent',
      color: IDLE_COLOR,
      cursor: 'pointer',
      lineHeight: '0',
    } satisfies Partial<CSSStyleDeclaration>);
    const svg = el.querySelector('svg');
    if (svg) {
      svg.setAttribute('width', '16');
      svg.setAttribute('height', '16');
    }
    el.addEventListener('mouseenter', () => {
      if (el.dataset.active !== '1') el.style.background = HOVER_BG;
    });
    el.addEventListener('mouseleave', () => {
      el.style.background = el.dataset.active === '1' ? ACTIVE_BG : 'transparent';
    });
    el.addEventListener('click', onClick);
    toolbar.appendChild(el);
    return el;
  };

  const formatButtons = INLINE_FORMATS.map((format) => ({
    format,
    el: createButton(label(format.i18nKey, format.fallbackLabel), format.icon, () =>
      applyFormat(format),
    ),
  }));
  createButton(label('schemas.text.link', 'Link'), LINK_ICON, applyLink);

  const refresh = () => {
    const context = getContext();
    if (!context || document.activeElement !== textarea) {
      hide();
      return;
    }
    const { runs } = context;
    const isActive = (style: StyleKey) => runs.length > 0 && runs.every((run) => Boolean(run[style]));
    formatButtons.forEach(({ format, el }) => setButtonActive(el, isActive(format.style)));
    positionToolbar();
  };

  const onSelect = () => {
    if (!textarea.isConnected) {
      destroy();
      return;
    }
    refresh();
  };

  const onBlur = () => {
    setTimeout(() => {
      if (document.activeElement !== textarea) hide();
    }, 0);
  };

  function destroy() {
    document.removeEventListener('selectionchange', onSelect);
    window.removeEventListener('scroll', onSelect, true);
    window.removeEventListener('resize', onSelect);
    textarea.removeEventListener('select', onSelect);
    textarea.removeEventListener('keyup', onSelect);
    textarea.removeEventListener('mouseup', onSelect);
    textarea.removeEventListener('blur', onBlur);
    toolbar.remove();
    if (activeToolbar?.toolbar === toolbar) activeToolbar = null;
  }

  document.body.appendChild(toolbar);
  document.addEventListener('selectionchange', onSelect);
  window.addEventListener('scroll', onSelect, true);
  window.addEventListener('resize', onSelect);
  textarea.addEventListener('select', onSelect);
  textarea.addEventListener('keyup', onSelect);
  textarea.addEventListener('mouseup', onSelect);
  textarea.addEventListener('blur', onBlur);

  activeToolbar = { toolbar, destroy };
};
