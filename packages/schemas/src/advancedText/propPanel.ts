import { propPanel as parentPropPanel } from '../text/propPanel';
import {Dict, PropPanel, PropPanelWidgetProps} from '@pdfme/common';
import { AdvancedTextSchema } from './types';

const mapDynamicVariables = (props: PropPanelWidgetProps) => {
  const { rootElement, changeSchemas, activeSchema, i18n } = props;

  const regex = /\{([^{}]+)}/g;
  const matches = activeSchema.data.match(regex);

  if (matches) {
    for (const match of matches) {
      const variableName = match.replace('{', '').replace('}', '');

      const input = document.createElement('input');
      input.type = 'text';
      input.value = variableName;
      input.onchange = (e: any) => {
        const val = e.target.value;
        changeSchemas([
          { key: 'dynamicVariables', value: { [variableName]: val }, schemaId: activeSchema.id },
        ]);
      };
      const label = document.createElement('label');
      label.innerText = variableName;
      label.style.cssText = 'display: flex; width: 100%;';
      label.appendChild(input);
      rootElement.appendChild(label);
    }
  } else {
    const para = document.createElement('p');
    para.innerHTML = 'Add variables by typing words surrounded by curly brackets, e.g. <code style="color:#168fe3; font-weight:bold;">{name}</code>';
    rootElement.appendChild(para);
  }
};

export const propPanel: PropPanel<AdvancedTextSchema> = {
  schema: (propPanelProps: Omit<PropPanelWidgetProps, 'rootElement'>) => {
    if (typeof parentPropPanel.schema !== 'function') {
      throw Error("Oops, is text schema no longer a function?");
    }
    return {
      ...parentPropPanel.schema(propPanelProps),
      '-------': {type: 'void', widget: 'Divider'},
      dynamicVariables: {type: 'object', widget: 'mapDynamicVariables', bind: false, span: 16},
      placeholderDynamicVar: {
        title: 'Placeholder Dynamic Variable',
        hidden: false,
        type: 'string',
        format: 'textarea',
        props: {
          id: 'placeholder-dynamic-var',
          autoSize: {
            minRows: 2,
            maxRows: 5
          }
        },
        span: 24,
      }
    };
  },
  widgets: { ...parentPropPanel.widgets, mapDynamicVariables },
  defaultValue: 'Type something...',
  defaultSchema: {
    ...parentPropPanel.defaultSchema,
    type: 'advancedText',
  },
};
