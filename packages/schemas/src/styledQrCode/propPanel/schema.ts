import type { StyledQrCodeSchema } from '../types.js';
import {
  DOT_TYPES,
  CORNER_SQUARE_TYPES,
  CORNER_DOT_TYPES,
} from '../constants.js';

export const createSchemaDefinition = (
  i18n: (key: string) => string,
  activeSchema: StyledQrCodeSchema,
) => {
  // Check if gradients are active for conditional display
  const dotsHasGradient =
    activeSchema.dotsOptions?.gradient?.type && activeSchema.dotsOptions.gradient.type !== 'none';
  const cornersSquareHasGradient =
    activeSchema.cornersSquareOptions?.gradient?.type &&
    activeSchema.cornersSquareOptions.gradient.type !== 'none';
  const cornersDotHasGradient =
    activeSchema.cornersDotOptions?.gradient?.type &&
    activeSchema.cornersDotOptions.gradient.type !== 'none';
  const backgroundHasGradient =
    activeSchema.backgroundOptions?.gradient?.type &&
    activeSchema.backgroundOptions.gradient.type !== 'none';

  return {
    qrContent: {
      title: 'QR Code Content',
      type: 'string',
      widget: 'qrContentWidget',
      bind: false as const,
      span: 24,
    },
    '---dots': { type: 'void', widget: 'Divider' },
    dotsColorType: {
      title: 'Dots Color',
      type: 'string',
      widget: 'dotsColorType',
      bind: false as const,
      span: 12,
    },
    'dotsOptions.type': {
      title: 'Dots Type',
      type: 'string',
      widget: 'select',
      default: 'square',
      props: {
        options: DOT_TYPES.map((type) => ({
          label: type.charAt(0).toUpperCase() + type.slice(1),
          value: type,
        })),
      },
      span: 12,
    },
    dotsGradientSlider: {
      type: 'string',
      widget: 'dotsGradientSlider',
      bind: false as const,
      span: 24,
      hidden: !dotsHasGradient,
    },
    '---cornersSquare': { type: 'void', widget: 'Divider' },
    cornersSquareColorType: {
      title: 'Corners Square Color',
      type: 'string',
      widget: 'cornersSquareColorType',
      bind: false as const,
      span: 12,
    },
    'cornersSquareOptions.type': {
      title: 'Corners Square Type',
      type: 'string',
      widget: 'select',
      default: 'square',
      props: {
        options: CORNER_SQUARE_TYPES.map((type) => ({
          label: type.charAt(0).toUpperCase() + type.slice(1),
          value: type,
        })),
      },
      span: 12,
    },
    cornersSquareGradientSlider: {
      type: 'string',
      widget: 'cornersSquareGradientSlider',
      bind: false as const,
      span: 24,
      hidden: !cornersSquareHasGradient,
    },
    '---cornersDot': { type: 'void', widget: 'Divider' },
    cornersDotColorType: {
      title: 'Corners Dot Color',
      type: 'string',
      widget: 'cornersDotColorType',
      bind: false as const,
      span: 12,
    },
    'cornersDotOptions.type': {
      title: 'Corners Dot Type',
      type: 'string',
      widget: 'select',
      default: 'square',
      props: {
        options: CORNER_DOT_TYPES.map((type) => ({
          label: type.charAt(0).toUpperCase() + type.slice(1),
          value: type,
        })),
      },
      span: 12,
    },
    cornersDotGradientSlider: {
      type: 'string',
      widget: 'cornersDotGradientSlider',
      bind: false as const,
      span: 24,
      hidden: !cornersDotHasGradient,
    },
    '---background': { type: 'void', widget: 'Divider' },
    backgroundColorType: {
      title: i18n('schemas.bgColor'),
      type: 'string',
      widget: 'backgroundColorType',
      bind: false as const,
      span: 12,
    },
    backgroundGradientSlider: {
      type: 'string',
      widget: 'backgroundGradientSlider',
      bind: false as const,
      span: 24,
      hidden: !backgroundHasGradient,
    },
    '---image': { type: 'void', widget: 'Divider' },
    imageSource: {
      title: 'Image Source',
      type: 'string',
      widget: 'imageSourceWidget',
      bind: false as const,
      span: 16,
    },
    'imageOptions.margin': {
      title: 'Image Margin',
      type: 'number',
      widget: 'inputNumber',
      default: 5,
      props: { min: 0 },
      span: 8,
    },
  };
};

