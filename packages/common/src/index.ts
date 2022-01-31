import { BLANK_PDF } from './constants';
import {
  Template,
  Schema,
  TextSchema,
  ImageSchema,
  BarcodeSchema,
  GeneratorOptions,
  UIOptions,
} from './type';
import { checkProps } from './helper';

const checkTemplate = (data: unknown) => checkProps(data, Template);

export {
  Template,
  Schema,
  TextSchema,
  ImageSchema,
  BarcodeSchema,
  GeneratorOptions,
  UIOptions,
  checkTemplate,
  BLANK_PDF as blankPdf,
};
