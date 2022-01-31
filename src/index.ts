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

const checkTemplate = (data: unknown) => checkProps(data, Template);

export {
  Template,
  Schema,
  TextSchema,
  ImageSchema,
  BarcodeSchema,
  GeneratorOptions,
  UIOptions,
  generate,
  Designer,
  Viewer,
  Form,
  checkTemplate,
  BLANK_PDF as blankPdf,
};
