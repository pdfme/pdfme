import { UIRenderProps } from '@pdfme/common';
import { MultiVariableTextSchema } from './types';
import { uiRender as parentUiRender } from '../text/uiRender';
import { isEditable } from '../utils';
import { substituteVariables } from './helper';

export const uiRender = async (arg: UIRenderProps<MultiVariableTextSchema>) => {
  const { value, schema, rootElement, mode, onChange, ...rest } = arg;

  // This plugin currently does not support editing in form view, setting as read-only.
  const mvtMode = mode == 'form' ? 'viewer' : mode;

  let text = schema.text;
  let numVariables = schema.variables.length;

  const parentRenderArgs = {
    value: isEditable(mvtMode, schema) ? text : substituteVariables(text, value),
    schema,
    mode: mvtMode,
    rootElement,
    onChange: (arg: { key: string; value: any; } | { key: string; value: any; }[]) => {
      console.log('looking to trigger on change with value: ', arg);
      if (!Array.isArray(arg)) {
        onChange && onChange({key: 'text', value: arg.value});
      } else {
        console.error('onChange is not an array, the parent text plugin has changed...');
      }
    },
    ...rest,
  };

  await parentUiRender(parentRenderArgs);

  const textBlock = rootElement.querySelector('#text-' + schema.id) as HTMLDivElement;
  if (textBlock) {
    textBlock.addEventListener('keyup', (event: KeyboardEvent) => {
      text = textBlock.textContent || '';
      if (keyPressShouldBeChecked(event)) {
        const newNumVariables = countUniqueVariableNames(text);
        if (numVariables !== newNumVariables) {
          // If variables were modified during this keypress, we trigger a change
          if (onChange) {
            onChange({key: 'text', value: text});
          }
          numVariables = newNumVariables;
        }
      }
    });
  } else {
    throw new Error('Text block not found. Ensure the text block has an id of "text-" + schema.id');
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
