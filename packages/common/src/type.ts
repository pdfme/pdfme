import { z } from 'zod';
import {
  Lang,
  Size,
  Alignment,
  barcodeSchemaTypes,
  schemaTypes as _schemaTypes,
  BarcodeSchemaType,
  SchemaType,
  CommonSchema as _CommonSchema,
  TextSchema,
  ImageSchema,
  BarcodeSchema,
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
  PreviewReactProps,
  DesignerProps,
  DesignerReactProps,
} from './schema.js';

type CommonSchema = z.infer<typeof _CommonSchema>;
export const schemaTypes = _schemaTypes;
export const isTextSchema = (arg: CommonSchema): arg is TextSchema => arg.type === 'text';
export const isImageSchema = (arg: CommonSchema): arg is ImageSchema => arg.type === 'image';
export const isBarcodeSchema = (arg: CommonSchema): arg is BarcodeSchema =>
  barcodeSchemaTypes.map((t) => t as string).includes(arg.type);

export type Lang = z.infer<typeof Lang>;
export type Size = z.infer<typeof Size>;
export type Alignment = z.infer<typeof Alignment>;
export type SchemaType = z.infer<typeof SchemaType>;
export type BarCodeType = z.infer<typeof BarcodeSchemaType>;
export type TextSchema = z.infer<typeof TextSchema>;
export type ImageSchema = z.infer<typeof ImageSchema>;
export type BarcodeSchema = z.infer<typeof BarcodeSchema>;
export type Schema = z.infer<typeof Schema>;
export type SchemaForUI = z.infer<typeof SchemaForUI>;
export type Font = z.infer<typeof Font>;
export type BasePdf = z.infer<typeof BasePdf>;
export type Template = z.infer<typeof Template>;
export type CommonProps = z.infer<typeof CommonProps>;
export type GeneratorOptions = z.infer<typeof GeneratorOptions>;
export type GenerateProps = z.infer<typeof GenerateProps>;
export type UIOptions = z.infer<typeof UIOptions>;
export type UIProps = z.infer<typeof UIProps>;
export type PreviewProps = z.infer<typeof PreviewProps>;
export type PreviewReactProps = z.infer<typeof PreviewReactProps>;
export type DesignerProps = z.infer<typeof DesignerProps>;
export type DesignerReactProps = z.infer<typeof DesignerReactProps>;
