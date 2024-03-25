import type { PropPanel } from '@pdfme/common';
import type { BarcodeSchema } from './types';
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

const barcodeIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-barcode"><path d="M3 5v14"/><path d="M8 5v14"/><path d="M12 5v14"/><path d="M17 5v14"/><path d="M21 5v14"/></svg>';

const barcodeDefaults: { defaultSchema: BarcodeSchema }[] = [
  {
    defaultSchema: {
      type: 'qrcode',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-qr-code"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>',
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
      type: 'japanpost',
      icon: barcodeIcon,
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
      type: 'ean13',
      icon: barcodeIcon,
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
      type: 'ean8',
      icon: barcodeIcon,
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
      type: 'code39',
      icon: barcodeIcon,
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
      type: 'code128',
      icon: barcodeIcon,
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
      type: 'nw7',
      icon: barcodeIcon,
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
      type: 'itf14',
      icon: barcodeIcon,
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
      type: 'upca',
      icon: barcodeIcon,
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
      type: 'upce',
      icon: barcodeIcon,
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
      type: 'gs1datamatrix',
      icon: barcodeIcon,
      content: '(01)03453120000011(17)191125(10)ABCD1234',
      position,
      ...defaultColors,
      width: 30,
      height: 30,
      rotate: 0,
      opacity: DEFAULT_OPACITY,
    },
  },
];

export const getPropPanelByBarcodeType = (barcodeType: string): PropPanel<BarcodeSchema> => {
  const barcodeHasText = barcodeType !== 'qrcode' && barcodeType !== 'gs1datamatrix';

  const defaults = barcodeDefaults.find(({ defaultSchema }) => defaultSchema.type === barcodeType);

  if (!defaults)
    throw new Error(`[@pdfme/schemas/barcodes] No default for barcode type ${barcodeType}`);

  return {
    schema: ({ i18n }) => ({
      barColor: {
        title: i18n('schemas.barcodes.barColor'),
        type: 'string',
        widget: 'color',
        rules: [
          {
            pattern: HEX_COLOR_PATTERN,
            message: i18n('hexColorPrompt'),
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
            message: i18n('hexColorPrompt'),
          },
        ],
      },
      ...(barcodeHasText
        ? {
            textColor: { title: i18n('schemas.textColor'), type: 'string', widget: 'color' },
            includetext: {
              title: i18n('schemas.barcodes.includetext'),
              type: 'boolean',
              widget: 'switch',
            },
          }
        : {}),
    }),
    ...defaults,
  };
};
