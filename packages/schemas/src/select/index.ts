import type * as CSS from 'csstype';
import { Plugin, getDefaultFont } from '@pdfme/common';
import text from '../text';
import { mapVerticalAlignToFlex, getBackgroundColor } from '../text/uiRender.js';
import { getFontKitFont, getBrowserVerticalFontAdjustments } from '../text/helper.js';
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_ALIGNMENT,
  DEFAULT_VERTICAL_ALIGNMENT,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_FONT_COLOR,
} from '../text/constants.js';
import { TextSchema } from '../text/types';

interface Select extends TextSchema {
  options: string[];
}

// TODO 実装
const schema: Plugin<Select> = {
  ui: async (arg) => {
    const { schema, value, onChange, rootElement, mode, options, _cache } = arg;

    const font = options?.font || getDefaultFont();
    const fontKitFont = await getFontKitFont(schema.fontName, font, _cache);

    const { topAdj, bottomAdj } = getBrowserVerticalFontAdjustments(
      fontKitFont,
      schema.fontSize ?? DEFAULT_FONT_SIZE,
      DEFAULT_LINE_HEIGHT,
      schema.verticalAlignment ?? DEFAULT_VERTICAL_ALIGNMENT
    );

    const topAdjustment = topAdj.toString();
    const bottomAdjustment = bottomAdj.toString();
    const textStyle: CSS.Properties = {
      fontFamily: schema.fontName ? `'${schema.fontName}'` : 'inherit',
      color: schema.fontColor ?? DEFAULT_FONT_COLOR,
      fontSize: `${schema.fontSize ?? DEFAULT_FONT_SIZE}pt`,
      letterSpacing: `${schema.characterSpacing ?? DEFAULT_CHARACTER_SPACING}pt`,
      textAlign: schema.alignment ?? DEFAULT_ALIGNMENT,
      backgroundColor: getBackgroundColor(value, schema),

      margin: '0',
      width: `${schema.width}mm`,
      height: `${schema.height}mm`,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: mapVerticalAlignToFlex(schema.verticalAlignment),
      paddingTop: `${topAdjustment}px`,
      marginBottom: `${bottomAdjustment}px`,
      position: 'relative',
    };

    const textElement = document.createElement('p');
    Object.assign(textElement.style, textStyle);
    rootElement.innerHTML = '';
    rootElement.appendChild(textElement);

    textElement.textContent = value;

    if (mode !== 'viewer' && !(mode === 'form' && schema.readOnly)) {
      textElement.style.cursor = 'pointer';
      textElement.addEventListener('click', () => {});

      const removeButton = document.createElement('button');
      removeButton.textContent = 'x';
      const buttonWidth = 30;
      const removeButtonStyle: CSS.Properties = {
        position: 'absolute',
        top: '0px',
        right: `-${buttonWidth}px`,
        padding: '5px',
        width: `${buttonWidth}px`,
        height: `${buttonWidth}px`,
      };
      Object.assign(removeButton.style, removeButtonStyle);
      removeButton.addEventListener('click', () => {
        onChange && onChange({ key: 'content', value: '' });
      });
      rootElement.appendChild(removeButton);
    }
  },
  pdf: text.pdf,
  propPanel: {
    ...text.propPanel,
    // TODO カスタマイズする。オプションを追加できるようにする
    schema: text.propPanel.schema,
    defaultSchema: {
      ...text.propPanel.defaultSchema,
      type: 'select',
      options: ['option1', 'option2', 'option3'],
    },
  },
  icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>',
};

export default schema;
