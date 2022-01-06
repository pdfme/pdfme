/* eslint dot-notation: "off"*/
import { PDFImage } from 'pdf-lib';
import { z } from 'zod';
export interface InputImageCache {
  [key: string]: PDFImage;
}

const langs = ['en', 'ja'] as const;
const Lang = z.enum(langs);
export type Lang = z.infer<typeof Lang>;

const Size = z.object({ height: z.number(), width: z.number() });
export type Size = z.infer<typeof Size>;

export const barcodeSchemaTypes = [
  'qrcode',
  'japanpost',
  'ean13',
  'ean8',
  'code39',
  'code128',
  'nw7',
  'itf14',
  'upca',
  'upce',
] as const;
const BarcodeSchemaType = z.enum(barcodeSchemaTypes);
export type BarCodeType = z.infer<typeof BarcodeSchemaType>;

const notBarcodeSchemaTypes = ['text', 'image'] as const;
export const templateSchemaTypes = [...notBarcodeSchemaTypes, ...barcodeSchemaTypes] as const;
const TemplateSchemaType = z.enum(templateSchemaTypes);
type TemplateSchemaType = z.infer<typeof TemplateSchemaType>;

const alignments = ['left', 'center', 'right'] as const;
const Alignment = z.enum(alignments);
export type Alignment = z.infer<typeof Alignment>;

const ArrayBufferSchema: z.ZodSchema<ArrayBuffer> = z.any().refine((v) => v instanceof ArrayBuffer);
const Uint8ArraySchema: z.ZodSchema<Uint8Array> = z.any().refine((v) => v instanceof Uint8Array);
const Data = z.union([ArrayBufferSchema, Uint8ArraySchema]);

const Font = z.record(
  z.object({
    data: Data,
    fallback: z.boolean().optional(),
    subset: z.boolean().optional(),
    index: z.number().optional(),
  })
);
export type Font = z.infer<typeof Font>;

const BasePdf = z.union([z.string(), Data]);
export type BasePdf = z.infer<typeof BasePdf>;

const CommonTemplateSchema = z.object({
  type: TemplateSchemaType,
  position: z.object({ x: z.number(), y: z.number() }),
  width: z.number(),
  height: z.number(),
  rotate: z.number().optional(),
});
type CommonTemplateSchema = z.infer<typeof CommonTemplateSchema>;

const TextTemplateSchema = CommonTemplateSchema.extend({
  type: z.literal(TemplateSchemaType.Enum.text),
  alignment: Alignment.optional(),
  fontSize: z.number().optional(),
  fontName: z.string().optional(),
  fontColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  characterSpacing: z.number().optional(),
  lineHeight: z.number().optional(),
});
export type TextTemplateSchema = z.infer<typeof TextTemplateSchema>;
export const isTextTemplateSchema = (arg: CommonTemplateSchema): arg is TextTemplateSchema =>
  arg.type === 'text';

const ImageTemplateSchema = CommonTemplateSchema.extend({
  type: z.literal(TemplateSchemaType.Enum.image),
});
export type ImageTemplateSchema = z.infer<typeof ImageTemplateSchema>;
export const isImageTemplateSchema = (arg: CommonTemplateSchema): arg is ImageTemplateSchema =>
  arg.type === 'image';

const BarcodeTemplateSchema = CommonTemplateSchema.extend({
  type: BarcodeSchemaType,
});
export type BarcodeTemplateSchema = z.infer<typeof BarcodeTemplateSchema>;
export const isBarcodeTemplateSchema = (arg: CommonTemplateSchema): arg is BarcodeTemplateSchema =>
  barcodeSchemaTypes.map((t) => t as string).includes(arg.type);

// TODO TemplateSchemaはSchemaにする
const TemplateSchema = z.union([TextTemplateSchema, ImageTemplateSchema, BarcodeTemplateSchema]);
export type TemplateSchema = z.infer<typeof TemplateSchema>;

const SchemaForUI = z.union([
  TextTemplateSchema.extend({ id: z.string(), key: z.string(), data: z.string() }),
  ImageTemplateSchema.extend({ id: z.string(), key: z.string(), data: z.string() }),
  BarcodeTemplateSchema.extend({ id: z.string(), key: z.string(), data: z.string() }),
]);
export type SchemaForUI = z.infer<typeof SchemaForUI>;

const Template = z.object({
  schemas: z.array(z.record(TemplateSchema)),
  basePdf: BasePdf,
  sampledata: z.array(z.record(z.string())).length(1).optional(),
  columns: z.array(z.string()).optional(),
});
export type Template = z.infer<typeof Template>;

// ---------------------------------------------

const Inputs = z.array(z.record(z.string())).min(1);

const CommonOptions = z.object({ font: Font.optional() });
type CommonOptions = z.infer<typeof CommonOptions>;

const CommonProps = z.object({ template: Template, options: CommonOptions.optional() });
export type CommonProps = z.infer<typeof CommonProps>;

const HTMLElementSchema: z.ZodSchema<HTMLElement> = z.any().refine((v) => v instanceof HTMLElement);
export const UIProps = CommonProps.extend({
  domContainer: HTMLElementSchema,
  size: Size,
  options: CommonOptions.extend({ lang: Lang.optional() }).optional(),
});
export type UIProps = z.infer<typeof UIProps>;

// -------------------generate-------------------

export const GenerateProps = CommonProps.extend({
  inputs: Inputs,
  options: CommonOptions.extend({ splitThreshold: z.number().optional() }).optional(),
});
export type GenerateProps = z.infer<typeof GenerateProps>;

// -----------------Form, Viewer-----------------

export const PreviewProps = UIProps.extend({
  inputs: Inputs,
  onChangeInput: z
    .function()
    .args(z.object({ index: z.number(), value: z.string(), key: z.string() }))
    .returns(z.void())
    .optional(),
});
export type PreviewProps = z.infer<typeof PreviewProps>;
const PreviewReactProps = PreviewProps.omit({ domContainer: true });
export type PreviewReactProps = z.infer<typeof PreviewReactProps>;

// ---------------TemplateDesigner---------------

export const TemplateDesignerProps = UIProps.extend({
  saveTemplate: z.function().args(Template).returns(z.void()),
});
export type TemplateDesignerProps = z.infer<typeof TemplateDesignerProps>;
const TemplateDesignerReactProps = TemplateDesignerProps.omit({ domContainer: true });
export type TemplateDesignerReactProps = z.infer<typeof TemplateDesignerReactProps>;
