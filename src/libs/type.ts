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

const alignments = ['left', 'center', 'right'] as const;
const Alignment = z.enum(alignments);
export type Alignment = z.infer<typeof Alignment>;

// prettier-ignore
const barcodeSchemaTypes = ['qrcode', 'japanpost', 'ean13', 'ean8', 'code39', 'code128', 'nw7', 'itf14', 'upca', 'upce'] as const;
const BarcodeSchemaType = z.enum(barcodeSchemaTypes);
export type BarCodeType = z.infer<typeof BarcodeSchemaType>;

const notBarcodeSchemaTypes = ['text', 'image'] as const;
export const schemaTypes = [...notBarcodeSchemaTypes, ...barcodeSchemaTypes] as const;
const SchemaType = z.enum(schemaTypes);

const CommonSchema = z.object({
  type: SchemaType,
  position: z.object({ x: z.number(), y: z.number() }),
  width: z.number(),
  height: z.number(),
  rotate: z.number().optional(),
});
type CommonSchema = z.infer<typeof CommonSchema>;

export const TextSchema = CommonSchema.extend({
  type: z.literal(SchemaType.Enum.text),
  alignment: Alignment.optional(),
  fontSize: z.number().optional(),
  fontName: z.string().optional(),
  fontColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  characterSpacing: z.number().optional(),
  lineHeight: z.number().optional(),
});
export type TextSchema = z.infer<typeof TextSchema>;
export const isTextSchema = (arg: CommonSchema): arg is TextSchema => arg.type === 'text';

export const ImageSchema = CommonSchema.extend({ type: z.literal(SchemaType.Enum.image) });
export type ImageSchema = z.infer<typeof ImageSchema>;
export const isImageSchema = (arg: CommonSchema): arg is ImageSchema => arg.type === 'image';

export const BarcodeSchema = CommonSchema.extend({ type: BarcodeSchemaType });
export type BarcodeSchema = z.infer<typeof BarcodeSchema>;
export const isBarcodeSchema = (arg: CommonSchema): arg is BarcodeSchema =>
  barcodeSchemaTypes.map((t) => t as string).includes(arg.type);

export const Schema = z.union([TextSchema, ImageSchema, BarcodeSchema]);
export type Schema = z.infer<typeof Schema>;

const SchemaForUIAdditionalInfo = z.object({ id: z.string(), key: z.string(), data: z.string() });
const SchemaForUI = z.union([
  TextSchema.merge(SchemaForUIAdditionalInfo),
  ImageSchema.merge(SchemaForUIAdditionalInfo),
  BarcodeSchema.merge(SchemaForUIAdditionalInfo),
]);
export type SchemaForUI = z.infer<typeof SchemaForUI>;

const ArrayBufferSchema: z.ZodSchema<ArrayBuffer> = z.any().refine((v) => v instanceof ArrayBuffer);
const Uint8ArraySchema: z.ZodSchema<Uint8Array> = z.any().refine((v) => v instanceof Uint8Array);
const Data = z.union([ArrayBufferSchema, Uint8ArraySchema]);

const Font = z.record(
  z.object({ data: Data, fallback: z.boolean().optional(), subset: z.boolean().optional() })
);
export type Font = z.infer<typeof Font>;

const BasePdf = z.union([z.string(), Data]);
export type BasePdf = z.infer<typeof BasePdf>;

export const Template = z.object({
  schemas: z.array(z.record(Schema)),
  basePdf: BasePdf,
  sampledata: z.array(z.record(z.string())).length(1).optional(),
  columns: z.array(z.string()).optional(),
});
export type Template = z.infer<typeof Template>;

const Inputs = z.array(z.record(z.string())).min(1);

const CommonOptions = z.object({ font: Font.optional() });
type CommonOptions = z.infer<typeof CommonOptions>;

const CommonProps = z.object({
  template: Template,
  options: CommonOptions.optional(),
});
export type CommonProps = z.infer<typeof CommonProps>;

// -------------------generate-------------------

export const GeneratorOptions = CommonOptions.extend({
  splitThreshold: z.number().optional(),
});
export type GeneratorOptions = z.infer<typeof GeneratorOptions>;

export const GenerateProps = CommonProps.extend({
  inputs: Inputs,
  options: GeneratorOptions.optional(),
}).strict();
export type GenerateProps = z.infer<typeof GenerateProps>;

// ---------------------------------------------

const UIOptions = CommonOptions.extend({ lang: Lang.optional() });
export type UIOptions = z.infer<typeof UIOptions>;

const HTMLElementSchema: z.ZodSchema<HTMLElement> = z.any().refine((v) => v instanceof HTMLElement);

export const UIProps = CommonProps.extend({
  domContainer: HTMLElementSchema,
  options: UIOptions.optional(),
});
export type UIProps = z.infer<typeof UIProps>;

// -----------------Form, Viewer-----------------

export const PreviewProps = UIProps.extend({
  inputs: Inputs,
  onChangeInput: z
    .function()
    .args(z.object({ index: z.number(), value: z.string(), key: z.string() }))
    .returns(z.void())
    .optional(),
}).strict();
export type PreviewProps = z.infer<typeof PreviewProps>;
const PreviewReactProps = PreviewProps.omit({ domContainer: true }).extend({ size: Size });
export type PreviewReactProps = z.infer<typeof PreviewReactProps>;

// ---------------TemplateDesigner---------------

export const TemplateDesignerProps = UIProps.extend({
  saveTemplate: z.function().args(Template).returns(z.void()),
}).strict();
export type TemplateDesignerProps = z.infer<typeof TemplateDesignerProps>;
const TemplateDesignerReactProps = TemplateDesignerProps.omit({ domContainer: true }).extend({
  size: Size,
});
export type TemplateDesignerReactProps = z.infer<typeof TemplateDesignerReactProps>;
