import Designer from './Designer';
import Form from './Form';
import Viewer from './Viewer';

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
  Designer,
  Viewer,
  Form,
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
