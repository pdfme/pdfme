import generate from './generate.js';
import {
  BLANK_PDF,
  checkTemplate,
  checkUIProps,
  checkPreviewProps,
  checkDesignerProps,
  checkGenerateProps,
} from '@pdfme/common';
import type {
  Lang,
  Size,
  Schema,
  Font,
  BasePdf,
  Template,
  GeneratorOptions,
  GenerateProps,
  UIOptions,
  UIProps,
  PreviewProps,
  DesignerProps,
  Plugin,
} from '@pdfme/common';

export {
  generate,
  BLANK_PDF,
  checkTemplate,
  checkUIProps,
  checkPreviewProps,
  checkDesignerProps,
  checkGenerateProps,
};

export type {
  Lang,
  Size,
  Schema,
  Font,
  BasePdf,
  Template,
  GeneratorOptions,
  GenerateProps,
  UIOptions,
  UIProps,
  PreviewProps,
  DesignerProps,
  Plugin,
};
