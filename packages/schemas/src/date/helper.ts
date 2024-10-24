import type * as CSS from 'csstype';
import AirDatepicker, { AirDatepickerLocale } from 'air-datepicker';
import localeEn from 'air-datepicker/locale/en';
import localeZh from 'air-datepicker/locale/zh';
import localeJa from 'air-datepicker/locale/ja';
import localeKo from 'air-datepicker/locale/ko';
import localeAr from 'air-datepicker/locale/ar';
import localeTh from 'air-datepicker/locale/th';
import localePl from 'air-datepicker/locale/pl';
import localeIt from 'air-datepicker/locale/it';
import localeDe from 'air-datepicker/locale/de';
import localeEs from 'air-datepicker/locale/es';
import localeFr from 'air-datepicker/locale/fr';
import { format } from 'date-fns';
import { enUS, zhCN, ja, ko, ar, th, pl, it, de, es, fr, Locale } from 'date-fns/locale';
import {
  Lang,
  Plugin,
  getFallbackFontName,
  DEFAULT_FONT_NAME,
  PropPanelSchema,
} from '@pdfme/common';
import text from '../text';
import { DEFAULT_OPACITY, HEX_COLOR_PATTERN } from '../constants.js';
import { mapVerticalAlignToFlex, getBackgroundColor } from '../text/uiRender';
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_ALIGNMENT,
  VERTICAL_ALIGN_MIDDLE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_FONT_COLOR,
} from '../text/constants.js';
import { DateSchema } from './types';
import { getExtraFormatterSchema, Formatter } from '../text/extraFormatter';
import { isEditable } from '../utils';

if (typeof window !== 'undefined') {
  import('../css-importer.js');
}

const getDateFnsLocale = (lang: Lang): Locale | undefined =>
  ({ en: enUS, zh: zhCN, ja, ko, ar, th, pl, it, de, es, fr }[lang]);

const getAirDatepickerLocale = (lang: Lang): AirDatepickerLocale | undefined =>
  ({
    en: localeEn,
    zh: localeZh,
    ja: localeJa,
    ko: localeKo,
    ar: localeAr,
    th: localeTh,
    pl: localePl,
    it: localeIt,
    de: localeDe,
    es: localeEs,
    fr: localeFr,
  }[lang]);

const strDateToDate = (strDate: string, type: 'date' | 'time' | 'dateTime'): Date => {
  if (type === 'time') {
    return new Date(`2021-01-01T${strDate}`);
  }
  return new Date(strDate);
};

export const getPlugin = ({
  type,
  defaultFormat,
  icon,
  formatsByLang,
}: {
  type: 'date' | 'time' | 'dateTime';
  defaultFormat: string;
  icon: string;
  formatsByLang: Record<Lang, string[]>;
}) => {
  const plugin: Plugin<DateSchema> = {
    ui: (arg) => {
      const { schema, value, onChange, rootElement, mode, options, i18n } = arg;

      const beforeRemoveEvent = new Event('beforeRemove');
      rootElement.dispatchEvent(beforeRemoveEvent);

      const textStyle: CSS.Properties = {
        fontFamily: schema.fontName ? `'${schema.fontName}'` : 'inherit',
        color: schema.fontColor ?? DEFAULT_FONT_COLOR,
        fontSize: `${schema.fontSize ?? DEFAULT_FONT_SIZE}pt`,
        letterSpacing: `${schema.characterSpacing ?? DEFAULT_CHARACTER_SPACING}pt`,
        textAlign: schema.alignment ?? DEFAULT_ALIGNMENT,
        backgroundColor: getBackgroundColor(value, schema),

        margin: '0',
        padding: '0',
        border: 'none',
        outline: 'none',
        width: `${schema.width}mm`,
        height: `${schema.height}mm`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: mapVerticalAlignToFlex(VERTICAL_ALIGN_MIDDLE),
        position: 'relative',
      };

      const input = document.createElement('input');

      Object.assign(input.style, textStyle);

      const commitChange = ({ datepicker }: { datepicker: AirDatepicker<HTMLInputElement> }) => {
        if (onChange) {
          const date = datepicker.selectedDates;
          const fmt =
            type === 'time' ? 'HH:mm' : type === 'date' ? 'yyyy/MM/dd' : 'yyyy/MM/dd HH:mm';
          const d = Array.isArray(date) ? date[0] : date || '';
          const value = d ? format(d, fmt) : '';
          onChange({ key: 'content', value });
        }
      };

      const airDatepicker = new AirDatepicker(input, {
        locale: getAirDatepickerLocale(options.lang || 'en'),
        selectedDates: [strDateToDate(value, type)],
        dateFormat: (date) => (schema.format ? format(date, schema.format) : ''),
        timepicker: type !== 'date',
        onlyTimepicker: type === 'time',
        isMobile: window.innerWidth < 768,
        buttons: [
          'clear',
          {
            content: i18n('close'),
            onClick: (datepicker) => {
              datepicker.hide();
              commitChange({ datepicker });
            },
          },
        ],
        onSelect: ({ datepicker }) => {
          mode !== 'designer' && commitChange({ datepicker });
        },
        onShow: () => {
          input.disabled = !isEditable(mode, schema);
        },
      });

      rootElement.addEventListener('beforeRemove', () => {
        if (mode === 'designer') {
          airDatepicker.destroy();
        }
      });
      input.addEventListener('click', () => {
        if (mode === 'designer') {
          airDatepicker.show();
        }
      });

      rootElement.appendChild(input);
    },
    pdf: (arg) => {
      const { schema, value } = arg;
      if (!value) return void 0;
      const date = strDateToDate(value, type);
      const formattedValue = format(date, schema.format);
      return text.pdf(
        Object.assign(arg, {
          value: formattedValue,
          schema: {
            ...schema,
            verticalAlignment: VERTICAL_ALIGN_MIDDLE,
            lineHeight: DEFAULT_LINE_HEIGHT,
          },
        })
      );
    },
    propPanel: {
      schema: ({ options, i18n }) => {
        const font = options.font || { [DEFAULT_FONT_NAME]: { data: '', fallback: true } };
        const lang = options.lang || 'en';
        const locale = getDateFnsLocale(lang);

        const fontNames = Object.keys(font);
        const fallbackFontName = getFallbackFontName(font);

        const formatter = getExtraFormatterSchema(i18n);
        formatter.buttons = formatter.buttons.filter(
          (button) => button.key === Formatter.ALIGNMENT
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
