/* eslint dot-notation: "off"*/
import { z } from 'zod';

const langs = ['en', 'ja'] as const;
export const Lang = z.enum(langs);

export const Size = z.object({ height: z.number(), width: z.number() });

const alignments = ['left', 'center', 'right'] as const;
export const Alignment = z.enum(alignments);

// prettier-ignore
export const barcodeSchemaTypes = ['qrcode', 'japanpost', 'ean13', 'ean8', 'code39', 'code128', 'nw7', 'itf14', 'upca', 'upce'] as const;
const notBarcodeSchemaTypes = ['text', 'image'] as const;
export const schemaTypes = [...notBarcodeSchemaTypes, ...barcodeSchemaTypes] as const;

export const BarcodeSchemaType = z.enum(barcodeSchemaTypes);
export const SchemaType = z.enum(schemaTypes);

export const CommonSchema = z.object({
  type: SchemaType,
  position: z.object({ x: z.number(), y: z.number() }),
  width: z.number(),
  height: z.number(),
  rotate: z.number().optional(),
});

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

export const ImageSchema = CommonSchema.extend({ type: z.literal(SchemaType.Enum.image) });

export const BarcodeSchema = CommonSchema.extend({ type: BarcodeSchemaType });

export const Schema = z.union([TextSchema, ImageSchema, BarcodeSchema]);

const SchemaForUIAdditionalInfo = z.object({ id: z.string(), key: z.string(), data: z.string() });
export const SchemaForUI = z.union([
  TextSchema.merge(SchemaForUIAdditionalInfo),
  ImageSchema.merge(SchemaForUIAdditionalInfo),
  BarcodeSchema.merge(SchemaForUIAdditionalInfo),
]);

const ArrayBufferSchema: z.ZodSchema<ArrayBuffer> = z.any().refine((v) => v instanceof ArrayBuffer);
const Uint8ArraySchema: z.ZodSchema<Uint8Array> = z.any().refine((v) => v instanceof Uint8Array);
const Data = z.union([ArrayBufferSchema, Uint8ArraySchema]);

export const Font = z.record(
  z.object({ data: Data, fallback: z.boolean().optional(), subset: z.boolean().optional() })
);

export const BasePdf = z.union([z.string(), Data]);

export const Template = z.object({
  schemas: z.array(z.record(Schema)),
  basePdf: BasePdf,
  sampledata: z.array(z.record(z.string())).length(1).optional(),
  columns: z.array(z.string()).optional(),
});

export const Inputs = z.array(z.record(z.string())).min(1);

const CommonOptions = z.object({ font: Font.optional() });

export const CommonProps = z.object({
  template: Template,
  options: CommonOptions.optional(),
});

// -------------------generate-------------------

export const GeneratorOptions = CommonOptions.extend({
  splitThreshold: z.number().optional(),
});

export const GenerateProps = CommonProps.extend({
  inputs: Inputs,
  options: GeneratorOptions.optional(),
}).strict();

// ---------------------------------------------

export const UIOptions = CommonOptions.extend({ lang: Lang.optional() });

const HTMLElementSchema: z.ZodSchema<HTMLElement> = z.any().refine((v) => v instanceof HTMLElement);

export const UIProps = CommonProps.extend({
  domContainer: HTMLElementSchema,
  options: UIOptions.optional(),
});

// -----------------Form, Viewer-----------------

export const PreviewProps = UIProps.extend({ inputs: Inputs }).strict();
export const PreviewReactProps = PreviewProps.omit({ domContainer: true }).extend({
  onChangeInput: z
    .function()
    .args(z.object({ index: z.number(), value: z.string(), key: z.string() }))
    .returns(z.void())
    .optional(),
  size: Size,
});

// ---------------Designer---------------

export const DesignerProps = UIProps.extend({}).strict();
export const DesignerReactProps = DesignerProps.omit({ domContainer: true }).extend({
  onSaveTemplate: z.function().args(Template).returns(z.void()),
  size: Size,
});
