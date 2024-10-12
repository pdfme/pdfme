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
import 'air-datepicker/air-datepicker.css';
import { format } from 'date-fns';
import { enUS, zhCN, ja, ko, ar, th, pl, it, de, es, fr, Locale } from 'date-fns/locale';
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
import { isEditable } from '../utils';

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

//TODO 
// デザイナー上で初期値を変更できない
// デザイナー上で選択できない
// 書式の上揃え、下揃え、中央揃えができない

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
    ui: async (arg) => {
      const { schema, value, onChange, rootElement, mode, options, i18n, _cache } = arg;

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
        padding: '0',
        border: 'none',
        outline: 'none',
        width: `${schema.width}mm`,
        height: `${schema.height}mm`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: mapVerticalAlignToFlex(schema.verticalAlignment),
        paddingTop: `${topAdjustment}px`,
        marginBottom: `${bottomAdjustment}px`,
        position: 'relative',
      };

      const input = document.createElement('input');
      input.disabled = !isEditable(mode, schema);
      Object.assign(input.style, textStyle);

      const date = schema.type === 'time' ? new Date(`2021-01-01T${value}`) : new Date(value);

      new AirDatepicker(input, {
        locale: getAirDatepickerLocale(options.lang || 'en'),
        selectedDates: [date],
        dateFormat: (date) => (schema.format ? format(date, schema.format) : ''),
        timepicker: type !== 'date',
        onlyTimepicker: type === 'time',
        buttons: ['clear', { content: i18n('close'), onClick: (dp) => dp.hide() }],
        onSelect: ({ date }) => {
          const fmt =
            type === 'time' ? 'HH:mm' : type === 'date' ? 'yyyy/MM/dd' : 'yyyy/MM/dd HH:mm';
          onChange &&
            onChange({ key: 'content', value: format(Array.isArray(date) ? date[0] : date, fmt) });
        },
      });

      rootElement.appendChild(input);
    },
    pdf: (arg) => {
      const { schema, value, options } = arg;
      if (!value) return void 0;
      const lang = (options.lang || 'en') as Lang;
      const locale = getDateFnsLocale(lang);
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
        const locale = getDateFnsLocale(lang);

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
