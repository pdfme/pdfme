import { Plugin } from '@pdfme/common';
import text from '../text/index';

type ExtractedTextSchema = typeof text extends Plugin<infer T> ? T : never;

interface DateTime extends ExtractedTextSchema {}

// TODO ここから実装

const dateTime: Plugin<DateTime> = {
  ui: (arg) => {
    const { schema, value, onChange, rootElement, mode } = arg;

    const dateTimeInput = document.createElement('input');
    dateTimeInput.type = 'datetime-local';
    dateTimeInput.value = value;
    dateTimeInput.style.border = 'none';
    dateTimeInput.style.backgroundColor = 'transparent';
    dateTimeInput.style.padding = '0';
    dateTimeInput.style.margin = '0';
    dateTimeInput.style.width = '100%';
    dateTimeInput.style.height = '100%';

    /*
    alignment: DEFAULT_ALIGNMENT,
    verticalAlignment: DEFAULT_VERTICAL_ALIGNMENT,
    fontSize: DEFAULT_FONT_SIZE,
    lineHeight: DEFAULT_LINE_HEIGHT,
    characterSpacing: DEFAULT_CHARACTER_SPACING,
    dynamicFontSize: undefined,
    fontColor: DEFAULT_FONT_COLOR,
    fontName: undefined,
    backgroundColor: '',
    opacity: DEFAULT_OPACITY,
    strikethrough: false,
    underline: false,
    */
    dateTimeInput.style.textAlign = schema.alignment || 'left';

    console.log(mode);
    if (mode === 'viewer' || (mode === 'form' && schema.readOnly)) {
      // dateTimeInput.disabled = true;
    } else {
      dateTimeInput.addEventListener('change', () => {
        onChange && onChange({ key: 'content', value: dateTimeInput.value });
      });
    }
    rootElement.appendChild(dateTimeInput);
  },
  pdf: text.pdf,
  propPanel: {
    widgets: text.propPanel.widgets,
    schema: text.propPanel.schema,
    defaultSchema: {
      ...text.propPanel.defaultSchema,
      name: '',
      type: 'datetime',
      content: new Date().toISOString().slice(0, 16),
    },
  },
  icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-clock"><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><path d="M17.5 17.5 16 16.3V14"/><circle cx="16" cy="16" r="6"/></svg>',
};

export default dateTime;
