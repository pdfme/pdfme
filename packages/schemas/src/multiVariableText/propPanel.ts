import { propPanel as parentPropPanel } from '../text/propPanel';
import { PropPanel, PropPanelWidgetProps } from '@pdfme/common';
import { MultiVariableTextSchema } from './types';

const mapDynamicVariables = (props: PropPanelWidgetProps) => {
  const { rootElement, changeSchemas, activeSchema, i18n, options } = props;

  const mvtSchema = (activeSchema as any);
  const text = mvtSchema.text || '';
  const variables = JSON.parse(mvtSchema.content) || {};
  const variablesChanged = updateVariablesFromText(text, variables);
  const varNames = Object.keys(variables);

  if (variablesChanged) {
    changeSchemas([
      { key: 'content', value: JSON.stringify(variables), schemaId: activeSchema.id },
      { key: 'variables', value: varNames, schemaId: activeSchema.id }
    ]);
  }

  const placeholderRowEl = document.getElementById('placeholder-dynamic-var')?.closest('.ant-form-item') as HTMLElement;
  if (!placeholderRowEl) {
    throw new Error('Failed to find Ant form placeholder row to create dynamic variables inputs.');
  }
  placeholderRowEl.style.display = 'none';

  // The wrapping form element has a display:flex which limits the width of the form fields, removing.
  (rootElement.parentElement as HTMLElement).style.display = 'block';

  if (varNames.length > 0) {
    for (let variableName of varNames) {
      const varRow = placeholderRowEl.cloneNode(true) as HTMLElement;

      const textarea = varRow.querySelector('textarea') as HTMLTextAreaElement;
      textarea.id = 'dynamic-var-' + variableName;
      textarea.value = variables[variableName];
      textarea.addEventListener('change', (e: Event) => {
        variables[variableName] = (e.target as HTMLTextAreaElement).value;
        changeSchemas([{ key: 'content', value: JSON.stringify(variables), schemaId: activeSchema.id }]);
      });

      const label = varRow.querySelector('label') as HTMLLabelElement
      label.innerText = variableName;

      varRow.style.display = 'block';
      rootElement.appendChild(varRow);
    }
  } else {
    const para = document.createElement('p');
    para.innerHTML = i18n('schemas.mvt.typingInstructions')
        + ` <code style="color:${options?.theme?.token?.colorPrimary || "#168fe3"}; font-weight:bold;">{`
        + i18n('schemas.mvt.sampleField')
        + '}</code>';
    rootElement.appendChild(para);
  }
};

export const propPanel: PropPanel<MultiVariableTextSchema> = {
  schema: (propPanelProps: Omit<PropPanelWidgetProps, 'rootElement'>) => {
    if (typeof parentPropPanel.schema !== 'function') {
      throw Error('Oops, is text schema no longer a function?');
    }
    return {
      ...parentPropPanel.schema(propPanelProps),
      '-------': { type: 'void', widget: 'Divider' },
      dynamicVarContainer: {
        title: propPanelProps.i18n('schemas.mvt.variablesSampleData'),
        type: 'string',
        widget: 'Card',
        span: 24,
        properties: {
          dynamicVariables: {
            type: 'object',
            widget: 'mapDynamicVariables',
            bind: false,
            span: 24
          },
          placeholderDynamicVar: {
            title: 'Placeholder Dynamic Variable',
            type: 'string',
            format: 'textarea',
            props: {
              id: 'placeholder-dynamic-var',
              autoSize: {
                minRows: 2,
                maxRows: 5,
              },
            },
            span: 24,
          },
        }
      },

    };
  },
  widgets: { ...parentPropPanel.widgets, mapDynamicVariables },
  defaultSchema: {
    ...parentPropPanel.defaultSchema,
    readOnly: false,
    type: 'multiVariableText',
    text: 'Add text here using {} for variables ',
    width: 50,
    height: 15,
    content: '{}',
    variables: [],
  },
};


const updateVariablesFromText = (text: string, variables: any): boolean => {
  const regex = /\{([^{}]+)}/g;
  const matches = text.match(regex);
  let changed = false;

  if (matches) {
    // Add any new variables
    for (const match of matches) {
      const variableName = match.replace('{', '').replace('}', '');
      if (!(variableName in variables)) {
        // NOTE: We upper case the variable name as the default value
        variables[variableName] = variableName.toUpperCase();
        changed = true;
      }
    }
    // Remove any that no longer exist
    Object.keys(variables).forEach((variableName) => {
      if (!matches.includes('{' + variableName + '}')) {
        delete variables[variableName];
        changed = true;
      }
    });
  } else {
    // No matches at all, so clear all variables
    Object.keys(variables).forEach((variableName) => {
      delete variables[variableName];
      changed = true;
    });
  }

  return changed;
}
