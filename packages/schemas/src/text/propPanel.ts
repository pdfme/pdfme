import {
  DEFAULT_FONT_NAME,
  PropPanel,
  PropPanelWidgetProps,
  PropPanelSchema,
  getFallbackFontName,
} from '@pdfme/common';
import type { TextSchema } from './types.js';
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_ALIGNMENT,
  DEFAULT_VERTICAL_ALIGNMENT,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_FONT_COLOR,
  DYNAMIC_FIT_VERTICAL,
  DYNAMIC_FIT_HORIZONTAL,
  DEFAULT_DYNAMIC_FIT,
  DEFAULT_DYNAMIC_MIN_FONT_SIZE,
  DEFAULT_DYNAMIC_MAX_FONT_SIZE,
  DEFAULT_TEXT_FORMAT,
  TEXT_FORMAT_INLINE_MARKDOWN,
  TEXT_FORMAT_PLAIN,
  TEXT_OVERFLOW_EXPAND,
  TEXT_OVERFLOW_VISIBLE,
  DEFAULT_TEXT_OVERFLOW,
  DEFAULT_FONT_VARIANT_FALLBACK,
  FONT_VARIANT_FALLBACK_ERROR,
  FONT_VARIANT_FALLBACK_PLAIN,
  FONT_VARIANT_FALLBACK_SYNTHETIC,
} from './constants.js';
import { DEFAULT_OPACITY, HEX_COLOR_PATTERN } from '../constants.js';
import { getExtraFormatterSchema } from './extraFormatter.js';
import { canUseTextOverflowExpand, isTextOverflowExpand } from './overflow.js';
import { createBoxDimension, getBoxDimensionPropPanelSchema } from '../box.js';

const UseDynamicFontSize = (props: PropPanelWidgetProps) => {
  const { rootElement, changeSchemas, activeSchema, i18n, basePdf } = props;
  const isExpand = isTextOverflowExpand(activeSchema as unknown as TextSchema, basePdf);

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked =
    !isExpand && Boolean((activeSchema as { dynamicFontSize?: unknown })?.dynamicFontSize);
  checkbox.disabled = isExpand;
  checkbox.onchange = (e: Event) => {
    const val = (e.target as HTMLInputElement).checked
      ? {
          min: DEFAULT_DYNAMIC_MIN_FONT_SIZE,
          max: DEFAULT_DYNAMIC_MAX_FONT_SIZE,
          fit: DEFAULT_DYNAMIC_FIT,
        }
      : undefined;
    changeSchemas([{ key: 'dynamicFontSize', value: val, schemaId: activeSchema.id }]);
  };
  const label = document.createElement('label');
  const span = document.createElement('span');
  span.innerText = i18n('schemas.text.dynamicFontSize') || '';
  span.style.cssText = 'margin-left: 0.5rem';
  label.style.cssText = 'display: flex; width: 100%;';
  label.style.opacity = isExpand ? '0.5' : '1';
  label.appendChild(checkbox);
  label.appendChild(span);
  rootElement.appendChild(label);
};

const UseInlineMarkdown = (props: PropPanelWidgetProps) => {
  const { rootElement, changeSchemas, activeSchema, i18n } = props;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked =
    (activeSchema as { textFormat?: unknown })?.textFormat === TEXT_FORMAT_INLINE_MARKDOWN;
  checkbox.onchange = (e: Event) => {
    const value = (e.target as HTMLInputElement).checked
      ? TEXT_FORMAT_INLINE_MARKDOWN
      : TEXT_FORMAT_PLAIN;
    changeSchemas([{ key: 'textFormat', value, schemaId: activeSchema.id }]);
  };
  const label = document.createElement('label');
  const span = document.createElement('span');
  span.innerText = i18n('schemas.text.inlineMarkdown') || '';
  span.style.cssText = 'margin-left: 0.5rem';
  label.style.cssText = 'display: flex; width: 100%;';
  label.appendChild(checkbox);
  label.appendChild(span);
  rootElement.appendChild(label);
};

export const propPanel: PropPanel<TextSchema> = {
  schema: ({ options, activeSchema, i18n, basePdf }) => {
    const font = options.font || { [DEFAULT_FONT_NAME]: { data: '', fallback: true } };
    const fontNames = Object.keys(font);
    const fallbackFontName = getFallbackFontName(font);

    const activeTextSchema = activeSchema as unknown as TextSchema;
    const canExpandOverflow = canUseTextOverflowExpand(activeTextSchema, basePdf);
    const isExpand = isTextOverflowExpand(activeTextSchema, basePdf);
    const enableDynamicFont =
      !isExpand && Boolean((activeSchema as { dynamicFontSize?: unknown })?.dynamicFontSize);
    const hideTextFormat = activeTextSchema.type === 'text' && activeTextSchema.readOnly !== true;
    const enableInlineMarkdown =
      activeTextSchema.textFormat === TEXT_FORMAT_INLINE_MARKDOWN && !hideTextFormat;
    const baseFontName =
      activeTextSchema.fontName && font[activeTextSchema.fontName]
        ? activeTextSchema.fontName
        : fallbackFontName;
    const optionalFontNames = [
      { label: baseFontName, value: '' },
      ...fontNames
        .filter((name) => name !== baseFontName)
        .map((name) => ({ label: name, value: name })),
    ];
    const overflowOptions = [
      { label: i18n('schemas.text.overflowVisible'), value: TEXT_OVERFLOW_VISIBLE },
      ...(canExpandOverflow
        ? [{ label: i18n('schemas.text.overflowExpand'), value: TEXT_OVERFLOW_EXPAND }]
        : []),
    ];

    const textSchema: Record<string, PropPanelSchema> = {
      fontName: {
        title: i18n('schemas.text.fontName'),
        type: 'string',
        widget: 'select',
        default: fallbackFontName,
        placeholder: fallbackFontName,
        props: { options: fontNames.map((name) => ({ label: name, value: name })) },
        span: 12,
      },
      fontSize: {
        title: i18n('schemas.text.size'),
        type: 'number',
        widget: 'inputNumber',
        span: 6,
        disabled: enableDynamicFont,
        props: { min: 0 },
      },
      characterSpacing: {
        title: i18n('schemas.text.spacing'),
        type: 'number',
        widget: 'inputNumber',
        span: 6,
        props: { min: 0 },
      },
      formatter: getExtraFormatterSchema(i18n),
      lineHeight: {
        title: i18n('schemas.text.lineHeight'),
        type: 'number',
        widget: 'inputNumber',
        props: { step: 0.1, min: 0 },
        span: 8,
      },
      overflow: {
        title: i18n('schemas.text.overflow'),
        type: 'string',
        widget: 'select',
        default: DEFAULT_TEXT_OVERFLOW,
        props: {
          options: overflowOptions,
        },
        span: 8,
      },
      useDynamicFontSize: { type: 'boolean', widget: 'UseDynamicFontSize', bind: false, span: 16 },
      dynamicFontSize: {
        type: 'object',
        widget: 'card',
        column: 3,
        properties: {
          min: {
            title: i18n('schemas.text.min'),
            type: 'number',
            widget: 'inputNumber',
            hidden: !enableDynamicFont,
            props: { min: 0 },
          },
          max: {
            title: i18n('schemas.text.max'),
            type: 'number',
            widget: 'inputNumber',
            hidden: !enableDynamicFont,
            props: { min: 0 },
          },
          fit: {
            title: i18n('schemas.text.fit'),
            type: 'string',
            widget: 'select',
            hidden: !enableDynamicFont,
            props: {
              options: [
                { label: i18n('schemas.horizontal'), value: DYNAMIC_FIT_HORIZONTAL },
                { label: i18n('schemas.vertical'), value: DYNAMIC_FIT_VERTICAL },
              ],
            },
          },
        },
      },
      fontColor: {
        title: i18n('schemas.textColor'),
        type: 'string',
        widget: 'color',
        props: {
          disabledAlpha: true,
        },
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
        props: {
          disabledAlpha: true,
        },
        rules: [
          {
            pattern: HEX_COLOR_PATTERN,
            message: i18n('validation.hexColor'),
          },
        ],
      },
      borderColor: {
        title: i18n('schemas.borderColor'),
        type: 'string',
        widget: 'color',
        props: {
          disabledAlpha: true,
        },
        rules: [
          {
            pattern: HEX_COLOR_PATTERN,
            message: i18n('validation.hexColor'),
          },
        ],
      },
      borderWidth: {
        title: i18n('schemas.borderWidth'),
        type: 'object',
        widget: 'lineTitle',
        span: 24,
        properties: getBoxDimensionPropPanelSchema(0.1),
      },
      padding: {
        title: i18n('schemas.padding'),
        type: 'object',
        widget: 'lineTitle',
        span: 24,
        properties: getBoxDimensionPropPanelSchema(),
      },
      useInlineMarkdown: {
        type: 'boolean',
        widget: 'UseInlineMarkdown',
        bind: false,
        hidden: hideTextFormat,
        span: enableInlineMarkdown ? 12 : 24,
      },
      fontVariantFallback: {
        title: i18n('schemas.text.variantFallback'),
        type: 'string',
        widget: 'select',
        default: DEFAULT_FONT_VARIANT_FALLBACK,
        hidden: !enableInlineMarkdown,
        props: {
          options: [
            { label: i18n('schemas.text.synthetic'), value: FONT_VARIANT_FALLBACK_SYNTHETIC },
            { label: i18n('schemas.text.plain'), value: FONT_VARIANT_FALLBACK_PLAIN },
            { label: i18n('schemas.text.error'), value: FONT_VARIANT_FALLBACK_ERROR },
          ],
        },
        span: 12,
      },
      fontVariants: {
        title: i18n('schemas.text.markdownFonts'),
        type: 'object',
        widget: 'card',
        column: 2,
        hidden: !enableInlineMarkdown,
        properties: {
          bold: {
            title: i18n('schemas.text.boldFont'),
            type: 'string',
            widget: 'select',
            props: { options: optionalFontNames },
          },
          italic: {
            title: i18n('schemas.text.italicFont'),
            type: 'string',
            widget: 'select',
            props: { options: optionalFontNames },
          },
          boldItalic: {
            title: i18n('schemas.text.boldItalicFont'),
            type: 'string',
            widget: 'select',
            props: { options: optionalFontNames },
          },
          code: {
            title: i18n('schemas.text.codeFont'),
            type: 'string',
            widget: 'select',
            props: { options: optionalFontNames },
          },
        },
      },
    };

    return textSchema;
  },
  widgets: { UseDynamicFontSize, UseInlineMarkdown },
  defaultSchema: {
    name: '',
    type: 'text',
    content: 'Type Something...',
    position: { x: 0, y: 0 },
    width: 45,
    height: 10,
    // If the value of "rotate" is set to undefined or not set at all, rotation will be disabled in the UI.
    // Check this document: https://pdfme.com//docs/custom-schemas#learning-how-to-create-from-pdfmeschemas-code
    rotate: 0,
    alignment: DEFAULT_ALIGNMENT,
    verticalAlignment: DEFAULT_VERTICAL_ALIGNMENT,
    fontSize: DEFAULT_FONT_SIZE,
    textFormat: DEFAULT_TEXT_FORMAT,
    overflow: DEFAULT_TEXT_OVERFLOW,
    fontVariantFallback: DEFAULT_FONT_VARIANT_FALLBACK,
    lineHeight: DEFAULT_LINE_HEIGHT,
    characterSpacing: DEFAULT_CHARACTER_SPACING,
    dynamicFontSize: undefined,
    fontColor: DEFAULT_FONT_COLOR,
    fontName: undefined,
    backgroundColor: '',
    borderColor: '#000000',
    borderWidth: createBoxDimension(0),
    padding: createBoxDimension(0),
    opacity: DEFAULT_OPACITY,
    strikethrough: false,
    underline: false,
  },
};
