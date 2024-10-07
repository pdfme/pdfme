import type * as CSS from 'csstype';
import { format } from 'date-fns';
import { zhCN, ja, ko, ar, th, pl, it, de, es, fr, Locale } from 'date-fns/locale';
import {
  Lang,
  Plugin,
  getDefaultFont,
  getFallbackFontName,
  DEFAULT_FONT_NAME,
  PropPanelSchema,
} from '@pdfme/common';
import text from '../text';
import { DEFAULT_OPACITY, HEX_COLOR_PATTERN } from '../constants.js';
import { mapVerticalAlignToFlex, getBackgroundColor } from '../text/uiRender';
import { getFontKitFont, getBrowserVerticalFontAdjustments } from '../text/helper.js';
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_ALIGNMENT,
  DEFAULT_VERTICAL_ALIGNMENT,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_FONT_COLOR,
} from '../text/constants.js';
import { DateSchema } from './types';
import { getExtraFormatterSchema, Formatter } from '../text/extraFormatter';

const getLocale = (lang: Lang): Locale | undefined =>
  ({ en: undefined, zh: zhCN, ja, ko, ar, th, pl, it, de, es, fr }[lang]);

export const getPlugin = ({
  type,
  defaultFormat,
  icon,
  inputType,
  formatsByLang,
}: {
  type: 'date' | 'time' | 'dateTime';
  defaultFormat: string;
  icon: string;
  inputType: string;
  formatsByLang: Record<Lang, string[]>;
}) => {
  const plugin: Plugin<DateSchema> = {
    ui: async (arg) => {
      const { schema, value, onChange, rootElement, mode, options, _cache } = arg;
      rootElement.innerHTML = '';

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
      rootElement.appendChild(textElement);

      textElement.textContent = value
        ? format(
            type === 'time' ? new Date(`2021-01-01T${value}`) : new Date(value),
            schema.format,
            { locale: getLocale(options?.lang || 'en') }
          )
        : '';

      if (mode !== 'viewer' && !(mode === 'form' && schema.readOnly)) {
        const dateTimeInput = document.createElement('input');
        dateTimeInput.type = inputType;
        dateTimeInput.value = value;

        const dateTimeInputStyle: CSS.Properties = {
          ...textStyle,
          opacity: '0',
          position: 'absolute',
          top: '0',
          left: '0',
          border: 'none',
          zIndex: '-1',
        };

        Object.assign(dateTimeInput.style, dateTimeInputStyle);
        rootElement.appendChild(dateTimeInput);

        textElement.style.cursor = 'pointer';
        textElement.addEventListener('click', () => {
          dateTimeInput.showPicker();
          textElement.style.opacity = '0';
          dateTimeInput.style.opacity = '1';
          dateTimeInput.style.zIndex = '1';
        });

        dateTimeInput.addEventListener('change', (e) => {
          if (onChange && e.target instanceof HTMLInputElement) {
            onChange({ key: 'content', value: e.target.value });
          }
        });

        dateTimeInput.addEventListener('blur', () => {
          textElement.style.opacity = '1';
          dateTimeInput.style.opacity = '0';
          dateTimeInput.style.zIndex = '-1';
        });

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
    pdf: (arg) => {
      const { schema, value, options } = arg;
      if (!value) return void 0;
      const lang = (options.language || 'en') as Lang;
      const locale = getLocale(lang);
      const date = schema.type === 'time' ? new Date(`2021-01-01T${value}`) : new Date(value);
      const formattedValue = format(date, schema.format, { locale });
      return text.pdf(
        Object.assign(arg, {
          value: formattedValue,
          schema: { ...schema, lineHeight: DEFAULT_LINE_HEIGHT },
        })
      );
    },
    propPanel: {
      schema: ({ options, i18n }) => {
        const font = options.font || { [DEFAULT_FONT_NAME]: { data: '', fallback: true } };
        const lang = options.lang || 'en';
        const locale = getLocale(lang);

        const fontNames = Object.keys(font);
        const fallbackFontName = getFallbackFontName(font);

        const formatter = getExtraFormatterSchema(i18n);
        formatter.buttons = formatter.buttons.filter(
          (button) => button.key !== Formatter.STRIKETHROUGH && button.key !== Formatter.UNDERLINE
        );

        const currentDate = new Date();

        const dateSchema: Record<string, PropPanelSchema> = {
          format: {
            title: i18n('schemas.date.format'),
            type: 'string',
            widget: 'select',
            props: {
              options: formatsByLang[lang].map((formatString) => ({
                label: `${formatString} (${format(currentDate, formatString, { locale })})`,
                value: formatString,
              })),
            },
            span: 24,
          },
          fontName: {
            title: i18n('schemas.text.fontName'),
            type: 'string',
            widget: 'select',
            default: fallbackFontName,
            props: { options: fontNames.map((name) => ({ label: name, value: name })) },
            span: 12,
          },
          fontSize: {
            title: i18n('schemas.text.size'),
            type: 'number',
            widget: 'inputNumber',
            span: 6,
            props: { min: 0 },
          },
          characterSpacing: {
            title: i18n('schemas.text.spacing'),
            type: 'number',
            widget: 'inputNumber',
            span: 6,
            props: { min: 0 },
          },
          formatter,
          fontColor: {
            title: i18n('schemas.textColor'),
            type: 'string',
            widget: 'color',
            rules: [
              {
                pattern: HEX_COLOR_PATTERN,
                message: i18n('validation.hexColor'),
              },
            ],
          },
          backgroundColor: {
            title: i18n('schemas.bgColor'),
            type: 'string',
            widget: 'color',
            rules: [
              {
                pattern: HEX_COLOR_PATTERN,
                message: i18n('validation.hexColor'),
              },
            ],
          },
        };

        return dateSchema;
      },
      defaultSchema: {
        name: '',
        format: defaultFormat,
        type,
        content: format(new Date(), defaultFormat),
        position: { x: 0, y: 0 },
        width: 70,
        height: 10,
        rotate: 0,
        alignment: DEFAULT_ALIGNMENT,
        verticalAlignment: DEFAULT_VERTICAL_ALIGNMENT,
        fontSize: DEFAULT_FONT_SIZE,
        characterSpacing: DEFAULT_CHARACTER_SPACING,
        fontColor: DEFAULT_FONT_COLOR,
        fontName: undefined,
        backgroundColor: '',
        opacity: DEFAULT_OPACITY,
      },
    },
    icon,
  };

  return plugin;
};
