import { z } from 'zod';

const langs = ['en', 'zh', 'ja', 'ko', 'ar', 'th', 'pl', 'it', 'de', 'es', 'fr'] as const;

export const Lang = z.enum(langs);
export const Dict = z.object({
  // -----------------used in ui-----------------
  cancel: z.string(),
  close: z.string(),
  field: z.string(),
  fieldName: z.string(),
  align: z.string(),
  width: z.string(),
  opacity: z.string(),
  height: z.string(),
  rotate: z.string(),
  edit: z.string(),
  required: z.string(),
  editable: z.string(),
  plsInputName: z.string(),
  fieldMustUniq: z.string(),
  notUniq: z.string(),
  noKeyName: z.string(),
  fieldsList: z.string(),
  editField: z.string(),
  type: z.string(),
  errorOccurred: z.string(),
  errorBulkUpdateFieldName: z.string(),
  commitBulkUpdateFieldName: z.string(),
  bulkUpdateFieldName: z.string(),
  addPageAfter: z.string(),
  removePage: z.string(),
  removePageConfirm: z.string(),
  // --------------------validation-------------------
  'validation.uniqueName': z.string(),
  'validation.hexColor': z.string(),

  // -----------------used in schemas-----------------
  'schemas.color': z.string(),
  'schemas.borderWidth': z.string(),
  'schemas.borderColor': z.string(),
  'schemas.backgroundColor': z.string(),
  'schemas.textColor': z.string(),
  'schemas.bgColor': z.string(),
  'schemas.horizontal': z.string(),
  'schemas.vertical': z.string(),
  'schemas.left': z.string(),
  'schemas.center': z.string(),
  'schemas.right': z.string(),
  'schemas.top': z.string(),
  'schemas.middle': z.string(),
  'schemas.bottom': z.string(),
  'schemas.padding': z.string(),

  'schemas.text.fontName': z.string(),
  'schemas.text.size': z.string(),
  'schemas.text.spacing': z.string(),
  'schemas.text.textAlign': z.string(),
  'schemas.text.verticalAlign': z.string(),
  'schemas.text.lineHeight': z.string(),
  'schemas.text.min': z.string(),
  'schemas.text.max': z.string(),
  'schemas.text.fit': z.string(),
  'schemas.text.dynamicFontSize': z.string(),
  'schemas.text.format': z.string(),

  'schemas.mvt.typingInstructions': z.string(),
  'schemas.mvt.sampleField': z.string(),
  'schemas.mvt.variablesSampleData': z.string(),

  'schemas.barcodes.barColor': z.string(),
  'schemas.barcodes.includetext': z.string(),

  'schemas.table.alternateBackgroundColor': z.string(),
  'schemas.table.tableStyle': z.string(),
  'schemas.table.showHead': z.string(),
  'schemas.table.headStyle': z.string(),
  'schemas.table.bodyStyle': z.string(),
  'schemas.table.columnStyle': z.string(),

  'schemas.date.format': z.string(),

  'schemas.select.options': z.string(),
  'schemas.select.optionPlaceholder': z.string(),

  'schemas.radioGroup.groupName': z.string(),
});
export const Mode = z.enum(['viewer', 'form', 'designer']);

export const ColorType = z.enum(['rgb', 'cmyk']).optional();

export const Size = z.object({ height: z.number(), width: z.number() });

export const Schema = z
  .object({
    name: z.string(),
    type: z.string(),
    content: z.string().optional(),
    position: z.object({ x: z.number(), y: z.number() }),
    width: z.number(),
    height: z.number(),
    rotate: z.number().optional(),
    opacity: z.number().optional(),
    readOnly: z.boolean().optional(),
    required: z.boolean().optional(),
    __bodyRange: z.object({ start: z.number(), end: z.number().optional() }).optional(),
    __isSplit: z.boolean().optional(),
  })
  .passthrough();

const SchemaForUIAdditionalInfo = z.object({ id: z.string() });
export const SchemaForUI = Schema.merge(SchemaForUIAdditionalInfo);

const ArrayBufferSchema: z.ZodSchema<ArrayBuffer> = z.any().refine((v) => v instanceof ArrayBuffer);
const Uint8ArraySchema: z.ZodSchema<Uint8Array> = z.any().refine((v) => v instanceof Uint8Array);

export const BlankPdf = z.object({
  width: z.number(),
  height: z.number(),
  padding: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  staticSchema: z.array(Schema).optional(),
});

const CustomPdf = z.union([z.string(), ArrayBufferSchema, Uint8ArraySchema]);

export const BasePdf = z.union([CustomPdf, BlankPdf]);

// Legacy keyed structure for BC - we convert to SchemaPageArray on import
export const LegacySchemaPageArray = z.array(z.record(Schema));
export const SchemaPageArray = z.array(z.array(Schema));

export const Template = z
  .object({
    schemas: SchemaPageArray,
    basePdf: BasePdf,
    pdfmeVersion: z.string().optional(),
  })
  .passthrough();

export const Inputs = z.array(z.record(z.any())).min(1);

export const Font = z.record(
  z.object({
    data: z.union([z.string(), ArrayBufferSchema, Uint8ArraySchema]),
    fallback: z.boolean().optional(),
    subset: z.boolean().optional(),
  })
);

export const CommonOptions = z.object({ font: Font.optional() }).passthrough();

const CommonProps = z.object({
  template: Template,
  options: CommonOptions.optional(),
  plugins: z.record(z.object({ ui: z.any(), pdf: z.any(), propPanel: z.any() })).optional(),
});

// -------------------generate-------------------

export const GeneratorOptions = CommonOptions.extend({
  colorType: ColorType,
  author: z.string().optional(),
  creationDate: z.date().optional(),
  creator: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  lang: Lang.optional(),
  modificationDate: z.date().optional(),
  producer: z.string().optional(),
  subject: z.string().optional(),
  title: z.string().optional(),
});

export const GenerateProps = CommonProps.extend({
  inputs: Inputs,
  options: GeneratorOptions.optional(),
}).strict();

// ---------------------ui------------------------

export const UIOptions = CommonOptions.extend({
  lang: Lang.optional(),
  labels: z.record(z.string(), z.string()).optional(),
  theme: z.record(z.string(), z.unknown()).optional(),
  icons: z.record(z.string(), z.string()).optional(),
  requiredByDefault: z.boolean().optional(),
});

const HTMLElementSchema: z.ZodSchema<HTMLElement> = z.any().refine((v) => v instanceof HTMLElement);

export const UIProps = CommonProps.extend({
  domContainer: HTMLElementSchema,
  options: UIOptions.optional(),
});

export const PreviewProps = UIProps.extend({ inputs: Inputs }).strict();

export const DesignerProps = UIProps.extend({}).strict();
