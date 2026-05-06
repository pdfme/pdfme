import {
  getDefaultFont,
  getInternalLinkTarget,
  normalizeLinkHref,
  UIRenderProps,
} from '@pdfme/common';
import { MultiVariableTextSchema } from './types.js';
import {
  uiRender as parentUiRender,
  buildStyledTextContainer,
  makeElementPlainTextContentEditable,
} from '../text/uiRender.js';
import { isEditable } from '../utils.js';
import { getFontKitFont } from '../text/helper.js';
import { CODE_BACKGROUND_COLOR, SYNTHETIC_BOLD_CSS_TEXT_SHADOW } from '../text/constants.js';
import { parseInlineMarkdown } from '../text/inlineMarkdown.js';
import { measureTextLines } from '../text/measure.js';
import { isInlineMarkdownTextSchema, resolveFontVariant } from '../text/richText.js';
import type { RichTextRun } from '../text/types.js';
import { substituteVariables, substituteVariablesAsInlineMarkdownLiterals } from './helper.js';
import { countUniqueVariableNames, visitVariables } from './variables.js';
import { getTextLineRange } from '../splitRange.js';

export const uiRender = async (arg: UIRenderProps<MultiVariableTextSchema>) => {
  const { value, schema, rootElement, mode, onChange, ...rest } = arg;

  let text = schema.text;
  let numVariables = schema.variables.length;
  const renderResolvedValue = schema.readOnly === true && mode !== 'designer';

  const renderValue = renderResolvedValue
    ? value
    : isInlineMarkdownTextSchema(schema)
      ? substituteVariablesAsInlineMarkdownLiterals(text, value)
      : substituteVariables(text, value);

  if (mode === 'form' && numVariables > 0 && !renderResolvedValue) {
    await formUiRender(arg);
    return;
  }

  await parentUiRender({
    value: isEditable(mode, schema) ? text : renderValue,
    schema,
    mode: mode === 'form' ? 'viewer' : mode, // if no variables for form it's just a viewer
    rootElement,
    onChange: (arg: { key: string; value: unknown } | { key: string; value: unknown }[]) => {
      if (!Array.isArray(arg)) {
        if (onChange) {
          onChange({ key: 'text', value: arg.value });
        }
      } else {
        throw new Error('onChange is not an array, the parent text plugin has changed...');
      }
    },
    ...rest,
  });

  const textBlock = rootElement.querySelector('#text-' + String(schema.id)) as HTMLDivElement;
  if (!textBlock) {
    throw new Error('Text block not found. Ensure the text block has an id of "text-" + schema.id');
  }

  if (mode === 'designer') {
    textBlock.addEventListener('keyup', (event: KeyboardEvent) => {
      text = textBlock.textContent || '';
      if (keyPressShouldBeChecked(event)) {
        const newNumVariables = countUniqueVariableNames(text);
        if (numVariables !== newNumVariables) {
          // If variables were modified during this keypress, we trigger a change
          if (onChange) {
            onChange({ key: 'text', value: text });
          }
          numVariables = newNumVariables;
        }
      }
    });
  }
};

const formUiRender = async (arg: UIRenderProps<MultiVariableTextSchema>) => {
  const { value, schema, rootElement, onChange, stopEditing, theme, _cache, options } = arg;
  const rawText = schema.text;

  if (rootElement.parentElement) {
    // remove the outline for the whole schema, we'll apply outlines on each individual variable field instead
    rootElement.parentElement.style.outline = '';
  }

  let variables: Record<string, string> = {};
  if (value) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        variables = parsed as Record<string, string>;
      }
    } catch {
      // value is not valid JSON — use empty variables
    }
  }
  const substitutedText = substituteVariables(rawText, variables);
  const inlineMarkdownRuns = isInlineMarkdownTextSchema(schema)
    ? parseInlineMarkdown(rawText)
    : undefined;
  const font = options?.font || getDefaultFont();
  const fontKitFont = await getFontKitFont(
    schema.fontName,
    font,
    _cache as Map<string, import('fontkit').Font>,
  );

  // The split/non-split form paths rebuild child spans after this call. We still create
  // the parent text block through the shared helper so sizing, alignment, and font
  // setup stay identical to the normal text renderer.
  const textBlock = buildStyledTextContainer(
    arg,
    fontKitFont,
    inlineMarkdownRuns
      ? getInlineMarkdownFormDisplayText(inlineMarkdownRuns, variables)
      : substitutedText,
  );

  const lineRange = getTextLineRange(schema);
  if (lineRange) {
    const { lines } = await measureTextLines({
      // Variable values are literal Form inputs. Escape markdown delimiters before
      // measuring so a value like "**name**" is not reinterpreted as template markdown
      // after blur/reflow.
      value: inlineMarkdownRuns
        ? substituteVariablesAsInlineMarkdownLiterals(rawText, variables)
        : substitutedText,
      schema,
      font,
      _cache,
      ignoreDynamicFontSize: true,
    });
    renderSplitVariableSpans({
      textBlock,
      lines,
      runs: inlineMarkdownRuns,
      rawText,
      variables,
      schema,
      font,
      theme,
      onChange,
      stopEditing,
    });
    return;
  }

  if (inlineMarkdownRuns) {
    renderInlineMarkdownVariableSpans({
      runs: inlineMarkdownRuns,
      variables,
      textBlock,
      schema,
      font,
      theme,
      onChange,
      stopEditing,
    });
    return;
  }

  const variableIndices = new Map<number, string>();
  visitVariables(rawText, ({ name, startIndex }) => {
    variableIndices.set(startIndex, name);
  });

  // Construct content-editable spans for each variable within the string
  let inVarString = false;

  for (let i = 0; i < rawText.length; i++) {
    const variableName = variableIndices.get(i);

    if (variableName) {
      inVarString = true;
      let span = document.createElement('span');
      span.style.outline = `${theme.colorPrimary} dashed 1px`;
      makeElementPlainTextContentEditable(span);
      span.textContent = variables[variableName];
      span.addEventListener('blur', (e: Event) => {
        const newValue = (e.target as HTMLSpanElement).textContent || '';
        if (newValue !== variables[variableName]) {
          variables[variableName] = newValue;
          if (onChange) onChange({ key: 'content', value: JSON.stringify(variables) });
          if (stopEditing) stopEditing();
        }
      });
      textBlock.appendChild(span);
    } else if (inVarString) {
      if (rawText[i] === '}') {
        inVarString = false;
      }
    } else {
      let span = document.createElement('span');
      span.style.letterSpacing = rawText.length === i + 1 ? '0' : 'inherit';
      span.textContent = rawText[i];
      textBlock.appendChild(span);
    }
  }
};

type SplitChunkSegment = {
  text: string;
  variableName?: string;
  variableStart?: number;
  variableEnd?: number;
  run?: RichTextRun;
};

type ResolvedChunkChar = {
  char: string;
  variableName?: string;
  variableOffset?: number;
  run?: RichTextRun;
};

type RenderFont = NonNullable<UIRenderProps<MultiVariableTextSchema>['options']['font']>;

const renderSplitVariableSpans = (arg: {
  textBlock: HTMLDivElement;
  lines: string[];
  runs?: RichTextRun[];
  rawText: string;
  variables: Record<string, string>;
  schema: MultiVariableTextSchema;
  font: RenderFont;
  theme: UIRenderProps<MultiVariableTextSchema>['theme'];
  onChange: UIRenderProps<MultiVariableTextSchema>['onChange'];
  stopEditing: UIRenderProps<MultiVariableTextSchema>['stopEditing'];
}) => {
  const { textBlock, lines, runs, rawText, variables, schema, font, theme, onChange, stopEditing } =
    arg;
  const lineRange = getTextLineRange(schema);
  const lineSegments = getSplitLineSegments({
    lines,
    runs,
    rawText,
    variables,
    start: lineRange?.start ?? 0,
    end: lineRange?.end ?? lines.length,
  });

  textBlock.innerHTML = '';
  lineSegments.forEach((segments, lineIndex) => {
    segments.forEach((segment) => {
      if (segment.variableName) {
        appendRangedVariableSpan({
          textBlock,
          segment,
          variables,
          schema,
          font,
          theme,
          onChange,
          stopEditing,
        });
        return;
      }

      const span = segment.run
        ? createStaticInlineMarkdownElement(segment.run)
        : document.createElement('span');
      span.style.letterSpacing = lineIndex === lineSegments.length - 1 ? '0' : 'inherit';
      span.textContent = segment.text;
      if (segment.run) {
        applyInlineMarkdownStyle({ element: span, run: segment.run, schema, font });
      }
      textBlock.appendChild(span);
    });

    if (lineIndex < lineSegments.length - 1) {
      textBlock.appendChild(document.createElement('br'));
    }
  });
};

const getSplitLineSegments = (arg: {
  lines: string[];
  runs?: RichTextRun[];
  rawText: string;
  variables: Record<string, string>;
  start: number;
  end: number;
}): SplitChunkSegment[][] => {
  const { lines, runs, rawText, variables, start, end } = arg;
  const resolvedChars = runs
    ? buildResolvedInlineMarkdownChars(runs, variables)
    : buildResolvedPlainChars(rawText, variables);
  const allLineSegments = consumeMeasuredLineSegments(lines, resolvedChars, {
    dropUnmappedTargets: Boolean(runs),
  });
  return allLineSegments.slice(start, end);
};

const buildResolvedPlainChars = (
  rawText: string,
  variables: Record<string, string>,
): ResolvedChunkChar[] => {
  const chars: ResolvedChunkChar[] = [];
  let lastIndex = 0;

  visitVariables(rawText, ({ name, startIndex, endIndex }) => {
    appendTextChars(chars, rawText.slice(lastIndex, startIndex));
    const value = variables[name] ?? '';
    // Empty variables have no rendered characters, so split chunks cannot infer which
    // page line should receive an empty editable span. The normal non-split form path
    // still supports editing them.
    for (let i = 0; i < value.length; i += 1) {
      chars.push({ char: value[i], variableName: name, variableOffset: i });
    }
    lastIndex = endIndex + 1;
  });

  appendTextChars(chars, rawText.slice(lastIndex));
  return chars;
};

const buildResolvedInlineMarkdownChars = (
  runs: RichTextRun[],
  variables: Record<string, string>,
): ResolvedChunkChar[] => {
  const chars: ResolvedChunkChar[] = [];

  runs.forEach((run) => {
    let lastIndex = 0;

    visitVariables(run.text, ({ name, startIndex, endIndex }) => {
      appendTextChars(chars, run.text.slice(lastIndex, startIndex), run);
      const value = variables[name] ?? '';
      for (let i = 0; i < value.length; i += 1) {
        chars.push({ char: value[i], variableName: name, variableOffset: i, run });
      }
      lastIndex = endIndex + 1;
    });

    appendTextChars(chars, run.text.slice(lastIndex), run);
  });

  return chars;
};

const appendTextChars = (chars: ResolvedChunkChar[], text: string, run?: RichTextRun) => {
  for (let i = 0; i < text.length; i += 1) {
    chars.push({ char: text[i], run });
  }
};

const consumeMeasuredLineSegments = (
  lines: string[],
  resolvedChars: ResolvedChunkChar[],
  options: { dropUnmappedTargets?: boolean } = {},
): SplitChunkSegment[][] => {
  const lineSegments: SplitChunkSegment[][] = [];
  let cursor = 0;

  lines.forEach((line) => {
    const segments: SplitChunkSegment[] = [];
    const lineText = stripTrailingLineBreaks(line);

    // `lines` must come from measuring the substituted MVT value. We map those measured
    // characters back to the same substituted value, annotated with variable offsets
    // and optional inline markdown run styles, so each editable span updates only the
    // touched variable range.
    for (let i = 0; i < lineText.length; i += 1) {
      const target = lineText[i];
      while (
        cursor < resolvedChars.length &&
        resolvedChars[cursor].char !== target &&
        isWhitespaceChar(resolvedChars[cursor].char) &&
        !isWhitespaceChar(target)
      ) {
        cursor += 1;
      }

      if (cursor >= resolvedChars.length) {
        if (options.dropUnmappedTargets) continue;
        appendSegment(segments, { char: target });
        continue;
      }

      const sourceChar = resolvedChars[cursor];
      if (sourceChar.char === target) {
        appendSegment(segments, sourceChar);
        cursor += 1;
      } else {
        // If a future text measurement path normalizes characters differently, keep
        // rendering the chunk but do not attach the mismatched character to a variable
        // offset. Advancing the cursor here would corrupt all following mappings.
        if (options.dropUnmappedTargets) continue;
        appendSegment(segments, { char: target });
      }
    }

    cursor = absorbHiddenTrailingWhitespace(segments, resolvedChars, cursor);

    // splitTextToSize appends a trailing line break marker to the last measured line of
    // each source paragraph. Advance past the original hard break when it exists.
    if (line.endsWith('\r\n') || line.endsWith('\n') || line.endsWith('\r')) {
      if (resolvedChars[cursor]?.char === '\r' && resolvedChars[cursor + 1]?.char === '\n') {
        cursor += 2;
      } else if (resolvedChars[cursor]?.char === '\n' || resolvedChars[cursor]?.char === '\r') {
        cursor += 1;
      }
    }

    lineSegments.push(segments);
  });

  return lineSegments;
};

const absorbHiddenTrailingWhitespace = (
  segments: SplitChunkSegment[],
  resolvedChars: ResolvedChunkChar[],
  cursor: number,
) => {
  let nextCursor = cursor;
  while (
    nextCursor < resolvedChars.length &&
    isHorizontalWhitespaceChar(resolvedChars[nextCursor].char)
  ) {
    const sourceChar = resolvedChars[nextCursor];
    const lastSegment = segments.at(-1);
    if (
      lastSegment &&
      lastSegment.variableName === sourceChar.variableName &&
      lastSegment.variableEnd === sourceChar.variableOffset &&
      lastSegment.run === sourceChar.run &&
      sourceChar.variableOffset !== undefined
    ) {
      lastSegment.variableEnd = sourceChar.variableOffset + 1;
    }
    nextCursor += 1;
  }
  return nextCursor;
};

const stripTrailingLineBreaks = (value: string) => {
  let end = value.length;
  while (end > 0) {
    const char = value[end - 1];
    if (char !== '\n' && char !== '\r') break;
    end -= 1;
  }
  return value.slice(0, end);
};

const isWhitespaceChar = (value: string) =>
  value === ' ' ||
  value === '\t' ||
  value === '\n' ||
  value === '\r' ||
  value === '\f' ||
  value === '\v';

const isHorizontalWhitespaceChar = (value: string) =>
  value === ' ' || value === '\t' || value === '\f' || value === '\v';

const appendSegment = (segments: SplitChunkSegment[], sourceChar: ResolvedChunkChar) => {
  const lastSegment = segments.at(-1);
  if (
    lastSegment &&
    lastSegment.variableName === sourceChar.variableName &&
    lastSegment.variableEnd === sourceChar.variableOffset &&
    lastSegment.run === sourceChar.run
  ) {
    lastSegment.text += sourceChar.char;
    if (sourceChar.variableOffset !== undefined) {
      lastSegment.variableEnd = sourceChar.variableOffset + 1;
    }
    return;
  }

  segments.push({
    text: sourceChar.char,
    variableName: sourceChar.variableName,
    variableStart: sourceChar.variableOffset,
    variableEnd:
      sourceChar.variableOffset === undefined ? undefined : sourceChar.variableOffset + 1,
    run: sourceChar.run,
  });
};

const appendRangedVariableSpan = (arg: {
  textBlock: HTMLDivElement;
  segment: SplitChunkSegment;
  variables: Record<string, string>;
  schema: MultiVariableTextSchema;
  font: RenderFont;
  theme: UIRenderProps<MultiVariableTextSchema>['theme'];
  onChange: UIRenderProps<MultiVariableTextSchema>['onChange'];
  stopEditing: UIRenderProps<MultiVariableTextSchema>['stopEditing'];
}) => {
  const { textBlock, segment, variables, schema, font, theme, onChange, stopEditing } = arg;
  if (!segment.variableName) return;

  const span = document.createElement('span');
  span.style.outline = `${theme.colorPrimary} dashed 1px`;
  if (segment.run) {
    applyInlineMarkdownStyle({ element: span, run: segment.run, schema, font });
  }
  makeElementPlainTextContentEditable(span);
  span.textContent = segment.text;
  span.addEventListener('blur', (e: Event) => {
    const variableName = segment.variableName;
    if (!variableName) return;

    const newValue = (e.target as HTMLSpanElement).textContent || '';
    if (newValue === segment.text) return;

    const currentValue = variables[variableName] ?? '';
    const start = Math.min(segment.variableStart ?? 0, currentValue.length);
    const end = Math.min(segment.variableEnd ?? currentValue.length, currentValue.length);
    variables[variableName] = currentValue.slice(0, start) + newValue + currentValue.slice(end);
    if (onChange) onChange({ key: 'content', value: JSON.stringify(variables) });
    if (stopEditing) stopEditing();
  });
  textBlock.appendChild(span);
};

const getInlineMarkdownFormDisplayText = (
  runs: RichTextRun[],
  variables: Record<string, string>,
): string => runs.map((run) => substituteVariables(run.text, variables)).join('');

const applyInlineMarkdownStyle = (arg: {
  element: HTMLElement;
  run: ReturnType<typeof parseInlineMarkdown>[number];
  schema: MultiVariableTextSchema;
  font: NonNullable<UIRenderProps<MultiVariableTextSchema>['options']['font']>;
}) => {
  const { element, run, schema, font } = arg;
  const resolvedFont = resolveFontVariant(run, schema, font);

  if (resolvedFont.fontName) {
    element.style.fontFamily = `'${resolvedFont.fontName}'`;
  }
  if (resolvedFont.syntheticBold) {
    element.style.fontWeight = '800';
    element.style.textShadow = SYNTHETIC_BOLD_CSS_TEXT_SHADOW;
  }
  if (resolvedFont.syntheticItalic) {
    element.style.fontStyle = 'italic';
  }
  const textDecorations: string[] = [];
  if (run.href) {
    textDecorations.push('underline');
  }
  if (run.strikethrough) {
    textDecorations.push('line-through');
  }
  if (textDecorations.length > 0) {
    element.style.textDecoration = textDecorations.join(' ');
  }
  if (run.code) {
    element.style.backgroundColor = CODE_BACKGROUND_COLOR;
    element.style.borderRadius = '2px';
    element.style.padding = '0 0.15em';
    if (!schema.fontVariants?.code || !font[schema.fontVariants.code]) {
      element.style.fontFamily = resolvedFont.fontName
        ? `'${resolvedFont.fontName}', monospace`
        : 'monospace';
    }
  }
};

const createStaticInlineMarkdownElement = (run: RichTextRun) => {
  const href = run.href ? normalizeLinkHref(run.href) : undefined;
  if (!href) return document.createElement('span');

  const anchor = document.createElement('a');
  anchor.href = href;
  if (!getInternalLinkTarget(href)) {
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  }
  return anchor;
};

const appendTextSpan = (arg: {
  textBlock: HTMLDivElement;
  text: string;
  run: ReturnType<typeof parseInlineMarkdown>[number];
  schema: MultiVariableTextSchema;
  font: NonNullable<UIRenderProps<MultiVariableTextSchema>['options']['font']>;
}) => {
  const { textBlock, text, run, schema, font } = arg;
  if (!text) return;

  const span = createStaticInlineMarkdownElement(run);
  span.textContent = text;
  applyInlineMarkdownStyle({ element: span, run, schema, font });
  textBlock.appendChild(span);
};

const appendVariableSpan = (arg: {
  textBlock: HTMLDivElement;
  variableName: string;
  variables: Record<string, string>;
  run: ReturnType<typeof parseInlineMarkdown>[number];
  schema: MultiVariableTextSchema;
  font: NonNullable<UIRenderProps<MultiVariableTextSchema>['options']['font']>;
  theme: UIRenderProps<MultiVariableTextSchema>['theme'];
  onChange: UIRenderProps<MultiVariableTextSchema>['onChange'];
  stopEditing: UIRenderProps<MultiVariableTextSchema>['stopEditing'];
}) => {
  const { textBlock, variableName, variables, run, schema, font, theme, onChange, stopEditing } =
    arg;
  const span = document.createElement('span');
  span.style.outline = `${theme.colorPrimary} dashed 1px`;
  applyInlineMarkdownStyle({ element: span, run, schema, font });
  makeElementPlainTextContentEditable(span);
  span.textContent = variables[variableName] ?? '';
  span.addEventListener('blur', (e: Event) => {
    const newValue = (e.target as HTMLSpanElement).textContent || '';
    if (newValue !== variables[variableName]) {
      variables[variableName] = newValue;
      if (onChange) onChange({ key: 'content', value: JSON.stringify(variables) });
      if (stopEditing) stopEditing();
    }
  });
  textBlock.appendChild(span);
};

const renderInlineMarkdownVariableSpans = (arg: {
  runs: RichTextRun[];
  variables: Record<string, string>;
  textBlock: HTMLDivElement;
  schema: MultiVariableTextSchema;
  font: NonNullable<UIRenderProps<MultiVariableTextSchema>['options']['font']>;
  theme: UIRenderProps<MultiVariableTextSchema>['theme'];
  onChange: UIRenderProps<MultiVariableTextSchema>['onChange'];
  stopEditing: UIRenderProps<MultiVariableTextSchema>['stopEditing'];
}) => {
  const { runs, variables, textBlock, schema, font, theme, onChange, stopEditing } = arg;
  textBlock.innerHTML = '';

  runs.forEach((run) => {
    let lastIndex = 0;

    visitVariables(run.text, ({ name, startIndex, endIndex }) => {
      appendTextSpan({
        textBlock,
        text: run.text.slice(lastIndex, startIndex),
        run,
        schema,
        font,
      });
      appendVariableSpan({
        textBlock,
        variableName: name,
        variables,
        run,
        schema,
        font,
        theme,
        onChange,
        stopEditing,
      });
      lastIndex = endIndex + 1;
    });

    appendTextSpan({
      textBlock,
      text: run.text.slice(lastIndex),
      run,
      schema,
      font,
    });
  });
};

/**
 * An optimisation to try to minimise jank while typing.
 * Only check whether variables were modified based on certain key presses.
 * Regex would otherwise be performed on every key press (which isn't terrible, but this code helps).
 */
const keyPressShouldBeChecked = (event: KeyboardEvent) => {
  if (
    event.key === 'ArrowUp' ||
    event.key === 'ArrowDown' ||
    event.key === 'ArrowLeft' ||
    event.key === 'ArrowRight'
  ) {
    return false;
  }

  const selection = window.getSelection();
  const contenteditable = event.target as HTMLDivElement;

  const isCursorAtEnd = selection?.focusOffset === contenteditable?.textContent?.length;
  if (isCursorAtEnd) {
    return event.key === '}' || event.key === 'Backspace' || event.key === 'Delete';
  }

  const isCursorAtStart = selection?.anchorOffset === 0;
  if (isCursorAtStart) {
    return event.key === '{' || event.key === 'Backspace' || event.key === 'Delete';
  }

  return true;
};
