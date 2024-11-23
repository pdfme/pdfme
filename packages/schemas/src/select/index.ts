import type * as CSS from 'csstype';
import { propPanel as parentPropPanel } from '../text/propPanel';
import { Plugin, PropPanelWidgetProps, SchemaForUI } from '@pdfme/common';
import text from '../text';
import { TextSchema } from '../text/types';
import { ChevronDown } from 'lucide';
import { createSvgStr } from '../utils.js';

const selectIcon = createSvgStr(ChevronDown);

interface Select extends TextSchema {
  options: string[];
}

const addOptions = (props: PropPanelWidgetProps) => {
  const { rootElement, changeSchemas, activeSchema, i18n } = props;

  rootElement.style.width = '100%';

  const selectSchema = activeSchema as SchemaForUI & Select;
  const currentOptions = selectSchema.options ? [...selectSchema.options] : [];

  const inputStyle = {
    width: '100%',
    padding: '6.25px 11px',
    border: '1px solid #ccc',
    borderRadius: '4px',
  };

  const buttonStyle = { border: 'none', borderRadius: '4px', cursor: 'pointer' };

  const updateSchemas = () => {
    changeSchemas([
      { key: 'options', value: currentOptions, schemaId: activeSchema.id },
      { key: 'content', value: currentOptions[0] || '', schemaId: activeSchema.id },
    ]);
  };

  const formContainer = document.createElement('div');
  Object.assign(formContainer.style, {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '10px',
  });

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = i18n('schemas.select.optionPlaceholder');
  Object.assign(input.style, inputStyle, { marginRight: '10px' });

  const addButton = document.createElement('button');
  addButton.textContent = '+';
  Object.assign(addButton.style, buttonStyle, {
    width: '25px',
    height: '25px',
    padding: '4px 8px',
  });

  addButton.addEventListener('click', () => {
    const newValue = input.value.trim();
    if (newValue) {
      currentOptions.push(newValue);
      updateSchemas();
      renderOptions();
      input.value = '';
    }
  });

  formContainer.appendChild(input);
  formContainer.appendChild(addButton);

  const optionsList = document.createElement('ul');
  Object.assign(optionsList.style, { listStyle: 'none', padding: '0' });

  const renderOptions = () => {
    optionsList.innerHTML = '';
    currentOptions.forEach((option, index) => {
      const li = document.createElement('li');
      Object.assign(li.style, { display: 'flex', alignItems: 'center', marginBottom: '5px' });

      const optionInput = document.createElement('input');
      optionInput.type = 'text';
      optionInput.value = option;
      Object.assign(optionInput.style, inputStyle, { marginRight: '10px' });

      optionInput.addEventListener('change', () => {
        currentOptions[index] = optionInput.value;
        updateSchemas();
      });

      const removeButton = document.createElement('button');
      removeButton.textContent = 'x';
      Object.assign(removeButton.style, buttonStyle, { padding: '4px 8px' });

      removeButton.addEventListener('click', () => {
        currentOptions.splice(index, 1);
        updateSchemas();
        renderOptions();
      });

      li.appendChild(optionInput);
      li.appendChild(removeButton);
      optionsList.appendChild(li);
    });
  };

  rootElement.appendChild(formContainer);
  rootElement.appendChild(optionsList);

  renderOptions();
};

const schema: Plugin<Select> = {
  ui: async (arg) => {
    const { schema, value, onChange, rootElement, mode } = arg;
    await text.ui(Object.assign(arg, { mode: 'viewer' }));

    if (mode !== 'viewer' && !(mode === 'form' && schema.readOnly)) {
      const buttonWidth = 30;
      const selectButton = document.createElement('button');
      selectButton.innerHTML = selectIcon;
      const selectButtonStyle: CSS.Properties = {
        position: 'absolute',
        zIndex: -1,
        right: `-${buttonWidth}px`,
        top: '0',
        padding: '0',
        margin: '0',
        cursor: 'pointer',
        height: `${buttonWidth}px`,
        width: `${buttonWidth}px`,
      };
      Object.assign(selectButton.style, selectButtonStyle);

      rootElement.appendChild(selectButton);

      const selectElement = document.createElement('select');
      const selectElementStyle: CSS.Properties = {
        opacity: '0',
        position: 'absolute',
        width: `calc(100% + ${buttonWidth}px)`,
        height: '100%',
        top: '0',
        left: '0',
        appearance: 'initial',
      };
      Object.assign(selectElement.style, selectElementStyle);
      selectElement.value = value;

      selectElement.addEventListener('change', (e) => {
        if (onChange && e.target instanceof HTMLSelectElement) {
          onChange && onChange({ key: 'content', value: e.target.value });
        }
      });

      selectElement.innerHTML = schema.options
        .map(
          (option) =>
            `<option value="${option}" ${option === value ? 'selected' : ''}>${option}</option>`
        )
        .join('');
      rootElement.appendChild(selectElement);
    }
  },
  pdf: text.pdf,
  propPanel: {
    ...text.propPanel,
    widgets: { ...parentPropPanel.widgets, addOptions },
    schema: (propPanelProps: Omit<PropPanelWidgetProps, 'rootElement'>) => {
      if (typeof parentPropPanel.schema !== 'function') {
        throw Error('Oops, is text schema no longer a function?');
      }

      return {
        ...parentPropPanel.schema(propPanelProps),
        '-------': { type: 'void', widget: 'Divider' },

        optionsContainer: {
          title: (propPanelProps as PropPanelWidgetProps).i18n('schemas.select.options'),
          type: 'string',
          widget: 'Card',
          span: 24,
          properties: { options: { widget: 'addOptions', span: 24 } },
        },
      };
    },
    defaultSchema: {
      ...text.propPanel.defaultSchema,
      type: 'select',
      content: 'option1',
      options: ['option1', 'option2'],
    },
  },
  icon: selectIcon,
};

export default schema;
