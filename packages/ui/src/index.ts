import Designer from './Designer';
import Form from './Form';
import Viewer from './Viewer';

import {
  BLANK_PDF,
  DEFAULT_FONT_VALUE,
  checkTemplate,
  checkUIProps,
  checkPreviewProps,
  checkDesignerProps,
  checkGenerateProps,
  validateBarcodeInput,
} from '@pdfme/common';

import type {
  Lang,
  Size,
  SchemaType,
  BarCodeType,
  Schema,
  SchemaForUI,
  Font,
  BasePdf,
  Template,
  CommonProps,
  GeneratorOptions,
  GenerateProps,
  UIOptions,
  UIProps,
  PreviewProps,
  DesignerProps,
} from '@pdfme/common';

export {
  Designer,
  Viewer,
  Form,
  BLANK_PDF,
  DEFAULT_FONT_VALUE,
  checkTemplate,
  checkUIProps,
  checkPreviewProps,
  checkDesignerProps,
  checkGenerateProps,
  validateBarcodeInput,
};

export type {
  Lang,
  Size,
  SchemaType,
  BarCodeType,
  Schema,
  SchemaForUI,
  Font,
  BasePdf,
  Template,
  CommonProps,
  GeneratorOptions,
  GenerateProps,
  UIOptions,
  UIProps,
  PreviewProps,
  DesignerProps,
};
