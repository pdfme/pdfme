import type { PropPanel } from '@pdfme/common';
import type { StyledQrCodeSchema } from '../types.js';
import { createQRContentWidget } from './widgets/QRContentWidget.js';
import { createColorTypeSelectorWidget } from './widgets/ColorTypeSelectorWidget.js';
import { createGradientSliderWidget } from './widgets/GradientSliderWidget.js';
import { createImageSourceWidget } from './widgets/ImageSourceWidget.js';
import { createSchemaDefinition } from './schema.js';
import {
  DEFAULT_STYLED_QR_CODE_BG_COLOR,
  DEFAULT_STYLED_QR_CODE_DOT_COLOR,
  DEFAULT_STYLED_QR_CODE_CORNER_COLOR,
} from '../constants.js';
import { DEFAULT_OPACITY } from '../../constants.js';

const position = { x: 0, y: 0 };

export const propPanel: PropPanel<StyledQrCodeSchema> = {
  widgets: {
    qrContentWidget: createQRContentWidget,
    dotsColorType: createColorTypeSelectorWidget('dotsOptions', DEFAULT_STYLED_QR_CODE_DOT_COLOR),
    dotsGradientSlider: createGradientSliderWidget('dotsOptions'),
    cornersSquareColorType: createColorTypeSelectorWidget(
      'cornersSquareOptions',
      DEFAULT_STYLED_QR_CODE_CORNER_COLOR,
    ),
    cornersSquareGradientSlider: createGradientSliderWidget('cornersSquareOptions'),
    cornersDotColorType: createColorTypeSelectorWidget(
      'cornersDotOptions',
      DEFAULT_STYLED_QR_CODE_CORNER_COLOR,
    ),
    cornersDotGradientSlider: createGradientSliderWidget('cornersDotOptions'),
    backgroundColorType: createColorTypeSelectorWidget(
      'backgroundOptions',
      DEFAULT_STYLED_QR_CODE_BG_COLOR,
    ),
    backgroundGradientSlider: createGradientSliderWidget('backgroundOptions'),
    imageSourceWidget: createImageSourceWidget,
  },
  schema: (props) => {
    const { i18n, activeSchema } = props;
    const qrSchema = activeSchema as StyledQrCodeSchema;
    return createSchemaDefinition(i18n, qrSchema);
  },
  defaultSchema: {
    name: '',
    type: 'styled-qr-code',
    content: 'https://example.com/qr-code/',
    position,
    width: 30,
    height: 30,
    rotate: 0,
    opacity: DEFAULT_OPACITY,
    dotsOptions: {
      color: DEFAULT_STYLED_QR_CODE_DOT_COLOR,
      type: 'square',
    },
    cornersSquareOptions: {
      color: DEFAULT_STYLED_QR_CODE_CORNER_COLOR,
      type: 'square',
    },
    cornersDotOptions: {
      color: DEFAULT_STYLED_QR_CODE_CORNER_COLOR,
      type: 'square',
    },
    backgroundOptions: {
      color: DEFAULT_STYLED_QR_CODE_BG_COLOR,
    },
    imageOptions: {
      imageSourceType: 'upload',
      margin: 5,
    },
    qrOptions: {
      errorCorrectionLevel: 'M',
    },
  },
};

