import { Plugin } from '@pdfme/common';
import { Schema } from '@pdfme/common';
import { Circle, CircleDot } from 'lucide';
import svg from '../graphics/svg';
import { isEditable, createSvgStr } from '../utils.js';
import { HEX_COLOR_PATTERN } from '../constants.js';

const defaultStroke = 'currentColor';

const getCheckedIcon = (stroke = defaultStroke) => createSvgStr(CircleDot, { stroke });
const getUncheckedIcon = (stroke = defaultStroke) => createSvgStr(Circle, { stroke });

interface RadioGroup extends Schema {
  group: string;
  color: string;
}

const getIcon = ({ value, color }: { value: string; color: string }) =>
  value === 'true' ? getCheckedIcon(color) : getUncheckedIcon(color);

const eventEmitter = new EventTarget();

interface RadioButtonState {
  value: string;
  onChange: (arg: { key: string; value: string }) => void;
}

const radioButtonStates = new Map<string, RadioButtonState>();
const eventListeners = new Map<string, EventListener>();

const schema: Plugin<RadioGroup> = {
  ui: (arg) => {
    const { schema, value, onChange, rootElement, mode } = arg;
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';

    if (onChange) {
      radioButtonStates.set(schema.name, { value, onChange });
    }

    const oldListener = eventListeners.get(schema.name);
    if (oldListener) {
      eventEmitter.removeEventListener(`group-${schema.group}`, oldListener);
    }

    const handleGroupEvent = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      const selectedSchemaName = customEvent.detail;
      if (selectedSchemaName !== schema.name) {
        const radioButtonState = radioButtonStates.get(schema.name);
        if (!radioButtonState) return;
        if (radioButtonState.value === 'true') {
          radioButtonState.onChange({ key: 'content', value: 'false' });
        }
      }
    };

    eventListeners.set(schema.name, handleGroupEvent);
    eventEmitter.addEventListener(`group-${schema.group}`, handleGroupEvent);

    if (isEditable(mode, schema)) {
      container.addEventListener('click', () => {
        if (value !== 'true' && onChange) {
          onChange({ key: 'content', value: 'true' });
          radioButtonStates.set(schema.name, { value: 'true', onChange });
          eventEmitter.dispatchEvent(
            new CustomEvent(`group-${schema.group}`, { detail: schema.name })
          );
        }
      });
    }

    void svg.ui({
      ...arg,
      rootElement: container,
      mode: 'viewer',
      value: getIcon({ value, color: schema.color }),
    });

    rootElement.appendChild(container);
  },
  pdf: (arg) =>
    svg.pdf(Object.assign(arg, { value: getIcon({ value: arg.value, color: arg.schema.color }) })),
  propPanel: {
    schema: ({ i18n }) => ({
      color: {
        title: i18n('schemas.color'),
        type: 'string',
        widget: 'color',
        required: true,
        rules: [{ pattern: HEX_COLOR_PATTERN, message: i18n('validation.hexColor') }],
      },
      group: {
        title: i18n('schemas.radioGroup.groupName'),
        type: 'string',
      },
    }),
    defaultSchema: {
      name: '',
      type: 'radioGroup',
      content: 'false',
      position: { x: 0, y: 0 },
      width: 8,
      height: 8,
      group: 'MyGroup',
      color: '#000000',
    },
  },
  icon: getCheckedIcon(),
};

export default schema;
