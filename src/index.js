import generate from './generate';
import Designer from './Designer';
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
import { checkProps } from './libs/helper';

export default {
  Template,
  Schema,
  TextSchema,
  ImageSchema,
  BarcodeSchema,
  GeneratorOptions,
  UIOptions,
  checkProps,
  generate,
  Designer,
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
  GeneratorOptions,
  UIOptions,
  checkProps,
  generate,
  Designer,
  Viewer,
  Form,
  BLANK_PDF as blankPdf,
};
