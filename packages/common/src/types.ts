import { z } from 'zod';
import type { Font as FontKitFont } from 'fontkit';
import type { PDFImage, PDFPage, PDFDocument } from '@pdfme/pdf-lib';
import type { WidgetProps as _PropPanelWidgetProps, Schema as _PropPanelSchema } from 'form-render';
import {
  Lang,
  Size,
  BarcodeSchemaType,
  SchemaType,
  Schema,
  SchemaInputs,
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

export type FontWidthCalcValues = {
  font: FontKitFont;
  fontSize: number;
  characterSpacing: number;
  boxWidthInPt: number;
};

export type PropPanelSchema = _PropPanelSchema;

type PropPanelProps = {
  rootElement: HTMLDivElement;
  activeSchema: SchemaForUI;
  activeElements: HTMLElement[];
  changeSchemas: (objs: { key: string; value: any; schemaId: string }[]) => void;
  schemas: SchemaForUI[];
  pageSize: Size;
  options: UIOptions;
}

export type PropPanelWidgetProps = _PropPanelWidgetProps & PropPanelProps;


export interface PropPanel<T extends Schema> {
  propPanelSchema: ((propPanelProps: Omit<PropPanelProps, 'rootElement'>) => Record<string, PropPanelSchema>) | Record<string, PropPanelSchema>;

  widgets?: Record<string, (props: PropPanelWidgetProps) => void>,
  defaultValue: string;
  defaultSchema: T;
}

interface ExtendSchema extends Schema {
  [key: string]: any;
}

export interface PDFRenderProps<T extends Schema> {
  value: string;
  schema: T;
  pdfLib: typeof import('@pdfme/pdf-lib');
  pdfDoc: PDFDocument;
  page: PDFPage;
  options: GeneratorOptions;

  _cache: Map<string, PDFImage>;
}

export type UIRenderProps<T extends Schema> = {
  schema: SchemaForUI & T;
  mode: 'viewer' | 'form';
  tabIndex?: number;
  placeholder?: string;
  stopEditing?: () => void;
  value: string;
  onChange?: (value: string) => void;
  rootElement: HTMLDivElement,
  options: UIOptions;
}

export type Plugin<T extends Schema & { [key: string]: any }> = {
  pdf: (arg: PDFRenderProps<T>) => Promise<void>;
  ui: (arg: UIRenderProps<T>) => Promise<void>;
  propPanel: PropPanel<T>;
}

export type Lang = z.infer<typeof Lang>;
export type Size = z.infer<typeof Size>;
export type SchemaType = z.infer<typeof SchemaType>;
export type BarCodeType = z.infer<typeof BarcodeSchemaType>;
export type Schema = z.infer<typeof Schema>;
export type SchemaInputs = z.infer<typeof SchemaInputs>;
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
