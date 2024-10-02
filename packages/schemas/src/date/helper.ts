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
import text from '../text/index';
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
        width: '100%',
        height: '100%',
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

      textElement.textContent = format(
        type === 'time' ? new Date(`2021-01-01T${value}`) : new Date(value),
        schema.format,
        {
          locale: getLocale(options?.lang || 'en'),
        }
      );

      const textElementRect = textElement.getBoundingClientRect();
      const textElementHeight = textElementRect.height;

      const computedStyle = window.getComputedStyle(textElement);
      const marginBottom = parseFloat(computedStyle.marginBottom);
      const totalHeight = textElementHeight + marginBottom;

      const dateTimeInput = document.createElement('input');
      dateTimeInput.type = inputType;
      dateTimeInput.value = value;

      const dateTimeInputStyle: CSS.Properties = {
        position: 'absolute',
        top: `${totalHeight}px`,
        left: '0',
        opacity: '0',
        border: 'none',
        backgroundColor: 'transparent',
        cursor: 'pointer',
        zIndex: -1,
      };

      Object.assign(dateTimeInput.style, dateTimeInputStyle);
      if (mode !== 'viewer' && !(mode === 'form' && schema.readOnly)) {
        textElement.style.cursor = 'pointer';
        textElement.addEventListener('click', () => {
          dateTimeInput.showPicker();
        });

        dateTimeInput.addEventListener('change', (e) => {
          if (onChange && e.target instanceof HTMLInputElement) {
            onChange({ key: 'content', value: e.target.value });
          }
        });
      }

      rootElement.appendChild(dateTimeInput);
    },
    pdf: (arg) => {
      const { schema, value, options } = arg;
      const lang = (options.language || 'en') as Lang;
      const locale = getLocale(lang);
      const date = schema.type === 'time' ? new Date(`2021-01-01T${value}`) : new Date(value);
      const formattedValue = format(date, schema.format, { locale });
      return text.pdf(Object.assign(arg, { value: formattedValue }));
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
        lineHeight: DEFAULT_LINE_HEIGHT,
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
