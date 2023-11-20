import type { PropPanel } from '@pdfme/common';
import type { BarcodeSchema } from './types';
import { DEFAULT_BARCODE_COLOR, DEFAULT_BARCODE_BG_COLOR } from './constants.js';

const defaultColors = {
  backgroundColor: DEFAULT_BARCODE_BG_COLOR,
  barColor: DEFAULT_BARCODE_COLOR,
};
const defaultTextColors = { textColor: DEFAULT_BARCODE_COLOR };
const position = { x: 0, y: 0 };
const default40x20 = { width: 40, height: 20 };

const barcodeDefaults: { defaultValue: string; defaultSchema: BarcodeSchema }[] = [
  {
    defaultValue: 'https://pdfme.com/',
    defaultSchema: {
      type: 'qrcode',
      position,
      ...defaultColors,
      width: 30,
      height: 30,
      rotate: 0,
    },
  },
  {
    defaultValue: '6540123789-A-K-Z',
    defaultSchema: {
      type: 'japanpost',
      position,
      ...defaultColors,
      ...defaultTextColors,
      width: 80,
      height: 7.2,
      rotate: 0,
    },
  },
  {
    defaultValue: '2112345678900',
    defaultSchema: {
      type: 'ean13',
      position,
      ...defaultColors,
      ...defaultTextColors,
      ...default40x20,
      height: 16,
      rotate: 0,
    },
  },
  {
    defaultValue: '02345673',
    defaultSchema: {
      type: 'ean8',
      position,
      ...defaultColors,
      ...defaultTextColors,
      ...default40x20,
      rotate: 0,
    },
  },
  {
    defaultValue: 'THIS IS CODE 39',
    defaultSchema: {
      type: 'code39',
      position,
      ...defaultColors,
      ...defaultTextColors,
      ...default40x20,
    },
  },
  {
    defaultValue: 'This is Code 128!',
    defaultSchema: {
      type: 'code128',
      position,
      ...defaultColors,
      ...defaultTextColors,
      ...default40x20,
      rotate: 0,
    },
  },
  {
    defaultValue: 'A0123456789B',
    defaultSchema: {
      type: 'nw7',
      position,
      ...defaultColors,
      ...defaultTextColors,
      ...default40x20,
      rotate: 0,
    },
  },
  {
    defaultValue: '04601234567893',
    defaultSchema: {
      type: 'itf14',
      position,
      ...defaultColors,
      ...defaultTextColors,
      ...default40x20,
      height: 12,
      rotate: 0,
    },
  },
  {
    defaultValue: '416000336108',
    defaultSchema: {
      type: 'upca',
      position,
      ...defaultColors,
      ...defaultTextColors,
      ...default40x20,
      height: 16,
      rotate: 0,
    },
  },
  {
    defaultValue: '00123457',
    defaultSchema: {
      type: 'upce',
      position,
      ...defaultColors,
      ...defaultTextColors,
      ...default40x20,
      rotate: 0,
    },
  },
  {
    defaultValue: '(01)03453120000011(17)191125(10)ABCD1234',
    defaultSchema: {
      type: 'gs1datamatrix',
      position,
      ...defaultColors,
      width: 30,
      height: 30,
      rotate: 0,
    },
  },
];

export const getPropPanelByBarcodeType = (barcodeType: string): PropPanel<BarcodeSchema> => {
  const barcodeHasText = barcodeType !== 'qrcode' && barcodeType !== 'gs1datamatrix';

  const defaults = barcodeDefaults.find(({ defaultSchema }) => defaultSchema.type === barcodeType);

  if (!defaults) throw new Error(`[@pdfme/schemas] No default for barcode type ${barcodeType}`);

  return {
    schema: ({ i18n }) => {
      return {
        barColor: { title: i18n('barColor'), type: 'string', widget: 'color' },
        backgroundColor: { title: i18n('bgColor'), type: 'string', widget: 'color' },
        ...(barcodeHasText
          ? { textColor: { title: i18n('textColor'), type: 'string', widget: 'color' } }
          : {}),
      };
    },
    ...defaults,
  };
};
