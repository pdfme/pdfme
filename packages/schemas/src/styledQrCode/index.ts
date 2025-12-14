import { pdfRender } from './pdfRender.js';
import { propPanel } from './propPanel/index.js';
import { uiRender } from './uiRender.js';
import type { StyledQrCodeSchema } from './types.js';
import { createSvgStr } from '../utils.js';
import { Plugin } from '@pdfme/common';
import { QrCode } from 'lucide';

const styledQrCode: Plugin<StyledQrCodeSchema> = {
  pdf: pdfRender,
  ui: uiRender,
  propPanel: propPanel,
  icon: createSvgStr(QrCode),
};

export default styledQrCode;
