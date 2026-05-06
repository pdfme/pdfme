import { getDefaultFont, UIRenderProps } from '@pdfme/common';
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
    if (getTextLineRange(schema)) {
      await parentUiRender({
        value: renderValue,
        schema,
        mode: 'viewer',
        rootElement,
        ...rest,
      });
      return;
    }

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

  const textBlock = buildStyledTextContainer(
    arg,
    fontKitFont,
    inlineMarkdownRuns
      ? getInlineMarkdownFormDisplayText(inlineMarkdownRuns, variables)
      : substitutedText,
  );

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

const appendTextSpan = (arg: {
  textBlock: HTMLDivElement;
  text: string;
  run: ReturnType<typeof parseInlineMarkdown>[number];
  schema: MultiVariableTextSchema;
  font: NonNullable<UIRenderProps<MultiVariableTextSchema>['options']['font']>;
}) => {
  const { textBlock, text, run, schema, font } = arg;
  if (!text) return;

  const span = document.createElement('span');
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
