import { UIRenderProps } from '@pdfme/common';
import { AdvancedTextSchema } from './types';
import { uiRender as parentUiRender } from '../text/uiRender';
import { isEditable } from '../utils';
import { substituteVariables, getUniqueVariableNames } from './helper';

export const uiRender = async (arg: UIRenderProps<AdvancedTextSchema>) => {
  const { value, schema, rootElement, mode, onChange, onCustomAttributeChange, ...rest } = arg;

  let content = schema.content;
  let numVariables = schema.variables.length;

  const renderArgs = {
    value: isEditable(mode, schema) ? content : substituteVariables(content, value),
    schema,
    mode,
    rootElement,
    onChange: (value: string) => {
      if (onChange && onCustomAttributeChange) onCustomAttributeChange('content', value);
    },
    ...rest,
  };

  await parentUiRender(renderArgs);

  const textBlock = rootElement.querySelector('#text-' + schema.id) as HTMLDivElement;
  if (textBlock) {
    textBlock.addEventListener('keyup', (event: KeyboardEvent) => {
      content = textBlock.textContent || '';
      if (keyPressShouldBeChecked(event)) {
        const newNumVariables = countUniqueVariableNames(content);
        if (numVariables !== newNumVariables) {
          // If variables were modified during this keypress, we trigger a change
          if (onCustomAttributeChange) {
            onCustomAttributeChange('content', content);
          }
          numVariables = newNumVariables;
        }
      }
    });
  } else {
    console.error('Text block not found. Ensure the text block has an id of "text-" + schema.id');
  }
};

const countUniqueVariableNames = (content: string) => {
  const regex = /\{([^}]+)}/g;

  const uniqueMatchesSet = new Set();
  let match;
  while ((match = regex.exec(content)) !== null) {
    uniqueMatchesSet.add(match[1]);
  }

  return uniqueMatchesSet.size;
};

/**
 * An optimisation to try to minimise jank while typing.
 * Only check whether variables were modified based on certain key presses.
 * Regex would otherwise be performed on every key press (which isn't terrible, but this code helps).
 */
const keyPressShouldBeChecked = (event: KeyboardEvent) => {
  if (event.key == "ArrowUp" || event.key == "ArrowDown" || event.key == "ArrowLeft" || event.key == "ArrowRight") {
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
}
