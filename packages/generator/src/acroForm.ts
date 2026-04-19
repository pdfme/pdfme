import {
  getDefaultFont,
  getFallbackFontName,
  type Font,
  type PDFRenderProps,
  type Plugin,
  type Schema,
} from '@pdfme/common';
import { PDFDocument, PDFFont, TextAlignment, type PDFRadioGroup } from '@pdfme/pdf-lib';
import { convertForPdfLayoutProps, hex2PrintingColor } from '@pdfme/schemas/utils';

type AcroFormSchema = Schema & {
  __acroRequired?: boolean;
};

type AcroTextSchema = AcroFormSchema & {
  alignment?: 'left' | 'center' | 'right' | 'justify';
  backgroundColor?: string;
  fontColor?: string;
  fontName?: string;
  fontSize?: number;
};

type AcroCheckboxSchema = AcroFormSchema & {
  color?: string;
};

type AcroRadioGroupSchema = AcroFormSchema & {
  __acroPageIndex?: number;
  color?: string;
  group?: string;
};

type RadioGroupCacheState = {
  optionKeys: Set<string>;
  radioGroup: PDFRadioGroup;
};

const DEFAULT_FONT_COLOR = '#000000';
const DEFAULT_FONT_SIZE = 13;
const DEFAULT_FORM_BACKGROUND_COLOR = '#ffffff';
const DEFAULT_FORM_BORDER_COLOR = '#000000';
const FIELD_NAME_COUNTS_CACHE_KEY = 'generateForm:fieldNameCounts';
const RADIO_GROUPS_CACHE_KEY = 'generateForm:radioGroups';

const getNextFieldName = (baseName: string, cache: PDFRenderProps<Schema>['_cache']) => {
  const normalizedBaseName = baseName.trim() || 'field';
  const counts =
    (cache.get(FIELD_NAME_COUNTS_CACHE_KEY) as Map<string, number> | undefined) ??
    new Map<string, number>();
  const count = (counts.get(normalizedBaseName) ?? 0) + 1;

  counts.set(normalizedBaseName, count);
  cache.set(FIELD_NAME_COUNTS_CACHE_KEY, counts);

  return count === 1 ? normalizedBaseName : `${normalizedBaseName}_${count}`;
};

const getFieldName = (schema: Schema, cache: PDFRenderProps<Schema>['_cache']) =>
  getNextFieldName(schema.name, cache);

const getRadioOptionName = (schema: Schema) => schema.name.trim() || 'option';

const getRadioGroupName = (schema: AcroRadioGroupSchema) =>
  (schema.group || schema.name).trim() || 'radioGroup';

const getRadioGroup = (arg: {
  pdfDoc: PDFDocument;
  schema: AcroRadioGroupSchema;
  _cache: PDFRenderProps<Schema>['_cache'];
}) => {
  const { pdfDoc, schema, _cache } = arg;
  const baseName = getRadioGroupName(schema);
  const optionKey = `${schema.__acroPageIndex ?? 0}:${getRadioOptionName(schema)}`;
  const radioGroups =
    (_cache.get(RADIO_GROUPS_CACHE_KEY) as Map<string, RadioGroupCacheState> | undefined) ??
    new Map<string, RadioGroupCacheState>();

  const cached = radioGroups.get(baseName);
  if (cached && !cached.optionKeys.has(optionKey)) {
    cached.optionKeys.add(optionKey);
    return cached.radioGroup;
  }

  const radioGroup = pdfDoc.getForm().createRadioGroup(getNextFieldName(baseName, _cache));
  const state = { optionKeys: new Set([optionKey]), radioGroup };
  radioGroups.set(baseName, state);
  _cache.set(RADIO_GROUPS_CACHE_KEY, radioGroups);
  return radioGroup;
};

const fetchFontData = async (font: Font, fontName: string) => {
  const fontValue = font[fontName];
  if (!fontValue) {
    throw new Error(`[@pdfme/generator] Font "${fontName}" is not configured`);
  }

  if (typeof fontValue.data !== 'string' || !fontValue.data.startsWith('http')) {
    return fontValue.data;
  }

  const res = await fetch(fontValue.data);
  if (!res.ok) {
    throw new Error(`[@pdfme/generator] Failed to fetch font data from ${fontValue.data}`);
  }
  return res.arrayBuffer();
};

const getPdfFont = async (arg: {
  pdfDoc: PDFDocument;
  font: Font;
  fontName: string;
  _cache: PDFRenderProps<Schema>['_cache'];
}) => {
  const { pdfDoc, font, fontName, _cache } = arg;
  const cacheKey = `generateForm:font:${fontName}`;
  const cached = _cache.get(cacheKey);
  if (cached instanceof PDFFont) {
    return cached;
  }

  const pdfFont = await pdfDoc.embedFont(await fetchFontData(font, fontName), {
    subset: font[fontName]?.subset ?? true,
  });
  _cache.set(cacheKey, pdfFont);
  return pdfFont;
};

const getTextAlignment = (alignment: AcroTextSchema['alignment']) => {
  switch (alignment) {
    case 'center':
      return TextAlignment.Center;
    case 'right':
      return TextAlignment.Right;
    default:
      return TextAlignment.Left;
  }
};

const renderAcroText = async (arg: PDFRenderProps<Schema>) => {
  const { value, pdfDoc, page, options, schema, _cache } = arg;
  const textSchema = schema as AcroTextSchema;
  const font = options.font ?? getDefaultFont();
  const fontName =
    textSchema.fontName && font[textSchema.fontName]
      ? textSchema.fontName
      : getFallbackFontName(font);
  const pdfFont = await getPdfFont({ pdfDoc, font, fontName, _cache });
  const { position, width, height, rotate } = convertForPdfLayoutProps({
    schema,
    pageHeight: page.getHeight(),
  });

  const textField = pdfDoc.getForm().createTextField(getFieldName(schema, _cache));

  textField.setText(value || undefined);
  textField.setAlignment(getTextAlignment(textSchema.alignment));
  textField.enableMultiline();
  if (textSchema.__acroRequired) textField.enableRequired();

  textField.addToPage(page, {
    x: position.x,
    y: position.y,
    width,
    height,
    rotate,
    font: pdfFont,
    textColor: hex2PrintingColor(textSchema.fontColor || DEFAULT_FONT_COLOR, options.colorType),
    backgroundColor: hex2PrintingColor(
      textSchema.backgroundColor || DEFAULT_FORM_BACKGROUND_COLOR,
      options.colorType,
    ),
    borderWidth: 0,
  });
  textField.setFontSize(textSchema.fontSize ?? DEFAULT_FONT_SIZE);
  textField.updateAppearances(pdfFont);
};

const renderAcroCheckbox = (arg: PDFRenderProps<Schema>) => {
  const { value, pdfDoc, page, options, schema, _cache } = arg;
  const checkboxSchema = schema as AcroCheckboxSchema;
  const { position, width, height, rotate } = convertForPdfLayoutProps({
    schema,
    pageHeight: page.getHeight(),
  });

  const checkBox = pdfDoc.getForm().createCheckBox(getFieldName(schema, _cache));
  if (value === 'true') checkBox.check();
  if (checkboxSchema.__acroRequired) checkBox.enableRequired();

  const color = checkboxSchema.color || DEFAULT_FORM_BORDER_COLOR;
  checkBox.addToPage(page, {
    x: position.x,
    y: position.y,
    width,
    height,
    rotate,
    textColor: hex2PrintingColor(color, options.colorType),
    backgroundColor: hex2PrintingColor(DEFAULT_FORM_BACKGROUND_COLOR, options.colorType),
    borderColor: hex2PrintingColor(color, options.colorType),
    borderWidth: 1,
  });
  checkBox.updateAppearances();
};

const renderAcroRadioGroup = (arg: PDFRenderProps<Schema>) => {
  const { value, pdfDoc, page, options, schema, _cache } = arg;
  const radioGroupSchema = schema as AcroRadioGroupSchema;
  const { position, width, height, rotate } = convertForPdfLayoutProps({
    schema,
    pageHeight: page.getHeight(),
  });

  const radioGroup = getRadioGroup({ pdfDoc, schema: radioGroupSchema, _cache });
  const color = radioGroupSchema.color || DEFAULT_FORM_BORDER_COLOR;
  const optionName = getRadioOptionName(schema);

  if (radioGroupSchema.__acroRequired) radioGroup.enableRequired();

  radioGroup.addOptionToPage(optionName, page, {
    x: position.x,
    y: position.y,
    width,
    height,
    rotate,
    textColor: hex2PrintingColor(color, options.colorType),
    backgroundColor: hex2PrintingColor(DEFAULT_FORM_BACKGROUND_COLOR, options.colorType),
    borderColor: hex2PrintingColor(color, options.colorType),
    borderWidth: 1,
  });

  if (value === 'true') radioGroup.select(optionName);
  radioGroup.updateAppearances();
};

export const acroTextPlugin: Plugin = {
  pdf: renderAcroText,
  ui: () => {},
  propPanel: {
    schema: {},
    defaultSchema: {
      name: '',
      type: 'acroText',
      position: { x: 0, y: 0 },
      width: 10,
      height: 10,
    },
  },
};

export const acroRadioGroupPlugin: Plugin = {
  pdf: renderAcroRadioGroup,
  ui: () => {},
  propPanel: {
    schema: {},
    defaultSchema: {
      name: '',
      type: 'acroRadioGroup',
      position: { x: 0, y: 0 },
      width: 8,
      height: 8,
    },
  },
};

export const acroCheckboxPlugin: Plugin = {
  pdf: renderAcroCheckbox,
  ui: () => {},
  propPanel: {
    schema: {},
    defaultSchema: {
      name: '',
      type: 'acroCheckbox',
      position: { x: 0, y: 0 },
      width: 8,
      height: 8,
    },
  },
};
