import generate from './generate';
import TemplateDesigner from './TemplateDesigner';
import Form from './Form';
import Viewer from './Viewer';
import { BLANK_PDF } from './libs/constants';
import {
  Template,
  Schema,
  TextSchema,
  ImageSchema,
  BarcodeSchema,
  GeneratorOptions,
  UIOptions,
} from './libs/type';

export default {
  generate,
  TemplateDesigner,
  Viewer,
  Form,
  blankPdf: BLANK_PDF,
};

export {
  Template,
  Schema,
  TextSchema,
  ImageSchema,
  BarcodeSchema,
  generate,
  TemplateDesigner,
  Viewer,
  Form,
  GeneratorOptions,
  UIOptions,
  BLANK_PDF as blankPdf,
};
