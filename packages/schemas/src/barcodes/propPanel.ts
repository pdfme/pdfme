import type { PropPanel } from '@pdfme/common';
import type { BarcodeSchema } from './types.js';
import {
  DEFAULT_BARCODE_COLOR,
  DEFAULT_BARCODE_BG_COLOR,
  DEFAULT_BARCODE_INCLUDETEXT,
} from './constants.js';
import { DEFAULT_OPACITY, HEX_COLOR_PATTERN } from '../constants.js';

const defaultColors = {
  backgroundColor: DEFAULT_BARCODE_BG_COLOR,
  barColor: DEFAULT_BARCODE_COLOR,
};
const defaultTextColors = { textColor: DEFAULT_BARCODE_COLOR };
const defaultIncludetext = { includetext: DEFAULT_BARCODE_INCLUDETEXT };
const position = { x: 0, y: 0 };
const default40x20 = { width: 40, height: 20 };

const barcodeDefaults: { defaultSchema: BarcodeSchema }[] = [
  {
    defaultSchema: {
      name: '',
      type: 'qrcode',
      content: 'https://pdfme.com/',
      position,
      ...defaultColors,
      width: 30,
      height: 30,
      rotate: 0,
      opacity: DEFAULT_OPACITY,
    },
  },
  {
    defaultSchema: {
      name: '',
      type: 'japanpost',
      content: '6540123789-A-K-Z',
      position,
      ...defaultColors,
      ...defaultTextColors,
      ...defaultIncludetext,
      width: 80,
      height: 7.2,
      rotate: 0,
      opacity: DEFAULT_OPACITY,
    },
  },
  {
    defaultSchema: {
      name: '',
      type: 'ean13',
      content: '2112345678900',
      position,
      ...defaultColors,
      ...defaultTextColors,
      ...defaultIncludetext,
      ...default40x20,
      height: 16,
      rotate: 0,
      opacity: DEFAULT_OPACITY,
    },
  },
  {
    defaultSchema: {
      name: '',
      type: 'ean8',
      content: '02345673',
      position,
      ...defaultColors,
      ...defaultTextColors,
      ...defaultIncludetext,
      ...default40x20,
      rotate: 0,
      opacity: DEFAULT_OPACITY,
    },
  },
  {
    defaultSchema: {
      name: '',
      type: 'code39',
      content: 'THIS IS CODE 39',
      position,
      ...defaultColors,
      ...defaultTextColors,
      ...defaultIncludetext,
      ...default40x20,
      opacity: DEFAULT_OPACITY,
    },
  },
  {
    defaultSchema: {
      name: '',
      type: 'code128',
      content: 'This is Code 128!',
      position,
      ...defaultColors,
      ...defaultTextColors,
      ...defaultIncludetext,
      ...default40x20,
      rotate: 0,
      opacity: DEFAULT_OPACITY,
    },
  },
  {
    defaultSchema: {
      name: '',
      type: 'nw7',
      content: 'A0123456789B',
      position,
      ...defaultColors,
      ...defaultTextColors,
      ...defaultIncludetext,
      ...default40x20,
      rotate: 0,
      opacity: DEFAULT_OPACITY,
    },
  },
  {
    defaultSchema: {
      name: '',
      type: 'itf14',
      content: '04601234567893',
      position,
      ...defaultColors,
      ...defaultTextColors,
      ...defaultIncludetext,
      ...default40x20,
      height: 12,
      rotate: 0,
      opacity: DEFAULT_OPACITY,
    },
  },
  {
    defaultSchema: {
      name: '',
      type: 'itf',
      content: '01234567890123456789012345678901234567890123',
      position,
      ...defaultColors,
      ...defaultTextColors,
      ...defaultIncludetext,
      ...default40x20,
      rotate: 0,
      opacity: DEFAULT_OPACITY,
    },
  },
  {
    defaultSchema: {
      name: '',
      type: 'upca',
      content: '416000336108',
      position,
      ...defaultColors,
      ...defaultTextColors,
      ...defaultIncludetext,
      ...default40x20,
      height: 16,
      rotate: 0,
      opacity: DEFAULT_OPACITY,
    },
  },
  {
    defaultSchema: {
      name: '',
      type: 'upce',
      content: '00123457',
      position,
      ...defaultColors,
      ...defaultTextColors,
      ...defaultIncludetext,
      ...default40x20,
      rotate: 0,
      opacity: DEFAULT_OPACITY,
    },
  },
  {
    defaultSchema: {
      name: '',
      type: 'gs1datamatrix',
      content: '(01)03453120000011(17)191125(10)ABCD1234',
      position,
      ...defaultColors,
      width: 30,
      height: 30,
      rotate: 0,
      opacity: DEFAULT_OPACITY,
    },
  },
  {
    defaultSchema: {
      name: '',
      type: 'pdf417',
      content: 'This is PDF417!',
      position,
      ...defaultColors,
      width: 40,
      height: 16,
      rotate: 0,
      opacity: DEFAULT_OPACITY,
    },
  },
];

export const getPropPanelByBarcodeType = (barcodeType: string): PropPanel<BarcodeSchema> => {
  const barcodeHasText =
    barcodeType !== 'qrcode' && barcodeType !== 'gs1datamatrix' && barcodeType !== 'pdf417';

  const defaults = barcodeDefaults.find(({ defaultSchema }) => defaultSchema.type === barcodeType);

  if (!defaults)
    throw new Error(`[@pdfme/schemas/barcodes] No default for barcode type ${barcodeType}`);

  return {
    schema: ({ i18n }) => ({
      barColor: {
        title: i18n('schemas.barcodes.barColor'),
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
      ...(barcodeHasText
        ? {
            textColor: {
              title: i18n('schemas.textColor'),
              type: 'string',
              widget: 'color',
              props: {
                disabledAlpha: true,
              },
            },
            includetext: {
              title: i18n('schemas.barcodes.includetext'),
              type: 'boolean',
              widget: 'switch',
            },
            alttext: {
              title: i18n('schemas.altText'),
              type: 'string',
              widget: 'input',
            },
            textxalign: {
              title: i18n('schemas.text.textAlign'),
              type: 'string',
              widget: 'select',
              props: {
                options: [
                  { label: i18n('schemas.left'), value: 'left' },
                  { label: i18n('schemas.center'), value: 'center' },
                  { label: i18n('schemas.right'), value: 'right' },
                ],
              },
            },
            textyalign: {
              title: i18n('schemas.vertical'),
              type: 'string',
              widget: 'select',
              props: {
                options: [
                  { label: i18n('schemas.bottom'), value: 'below' },
                  { label: i18n('schemas.top'), value: 'above' },
                ],
              },
            },
            textsize: {
              title: i18n('schemas.text.size'),
              type: 'number',
              widget: 'inputNumber',
              props: { min: 1 },
            },
            textyoffset: {
              title: i18n('schemas.textYOffset'),
              type: 'number',
              widget: 'inputNumber',
            },
          }
        : {}),
      // General rendering controls
      scale: {
        title: i18n('schemas.scale'),
        type: 'number',
        widget: 'inputNumber',
        props: { min: 1 },
        placeholder: 'Default 5',
      },
      padding: {
        title: i18n('schemas.padding'),
        type: 'number',
        widget: 'inputNumber',
        props: { min: 0 },
      },
      // Border controls removed for now due to inconsistent behavior across symbologies
      format: {
        title: i18n('schemas.outputFormat'),
        type: 'string',
        widget: 'select',
        props: {
          options: [
            { label: 'PNG', value: 'png' },
            { label: 'SVG', value: 'svg' },
          ],
        },
      },
      ...(barcodeType === 'qrcode'
        ? {
            eclevel: {
              title: i18n('schemas.qr.eclevel'),
              type: 'string',
              widget: 'select',
              props: {
                options: [
                  { label: 'L (7%)', value: 'L' },
                  { label: 'M (15%)', value: 'M' },
                  { label: 'Q (25%)', value: 'Q' },
                  { label: 'H (30%)', value: 'H' },
                ],
              },
              default: 'M',
            },
            version: {
              title: i18n('schemas.qr.version'),
              type: 'number',
              widget: 'inputNumber',
              props: { min: 1, max: 40 },
              placeholder: 'Auto',
            },
            mask: {
              title: i18n('schemas.qr.mask'),
              type: 'number',
              widget: 'inputNumber',
              props: { min: 0, max: 7 },
              placeholder: 'Auto',
            },
            qzone: {
              title: i18n('schemas.qr.qzone'),
              type: 'number',
              widget: 'inputNumber',
              props: { min: 0 },
              default: 4,
            },
          }
        : {}),
      ...(barcodeType === 'pdf417'
        ? {
            columns: {
              title: i18n('schemas.pdf417.columns'),
              type: 'number',
              widget: 'inputNumber',
              props: { min: 1 },
              default: 5,
            },
            rows: {
              title: i18n('schemas.pdf417.rows'),
              type: 'number',
              widget: 'inputNumber',
              props: { min: 1 },
            },
            compact: {
              title: i18n('schemas.pdf417.compact'),
              type: 'boolean',
              widget: 'switch',
              default: false,
            },
            eclevel: {
              title: i18n('schemas.pdf417.eclevel'),
              type: 'number',
              widget: 'inputNumber',
              props: { min: 0, max: 8 },
              default: 2,
            },
          }
        : {}),
    }),
    ...defaults,
  };
};
