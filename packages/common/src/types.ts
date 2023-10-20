import { z } from 'zod';
import type { PDFImage, PDFPage, PDFDocument } from '@pdfme/pdf-lib';
import type { WidgetProps as _PropPanelWidgetProps, Schema as _PropPanelSchema } from 'form-render';
import {
  Lang,
  Size,
  Schema,
  SchemaInputs,
  SchemaForUI,
  Font,
  BasePdf,
  Template,
  GeneratorOptions,
  GenerateProps,
  UIOptions,
  UIProps,
  PreviewProps,
  PreviewReactProps,
  DesignerProps,
  DesignerReactProps,
} from './schema.js';

export type PropPanelSchema = _PropPanelSchema;
export type ChangeSchemas = (objs: { key: string; value: any; schemaId: string }[]) => void;

type PropPanelProps = {
  rootElement: HTMLDivElement;
  activeSchema: SchemaForUI;
  activeElements: HTMLElement[];
  changeSchemas: ChangeSchemas;
  schemas: SchemaForUI[];
  pageSize: Size;
  options: UIOptions;
};

export type PropPanelWidgetProps = _PropPanelWidgetProps & PropPanelProps;

export interface PropPanel<T extends Schema> {
  propPanelSchema:
    | ((propPanelProps: Omit<PropPanelProps, 'rootElement'>) => Record<string, PropPanelSchema>)
    | Record<string, PropPanelSchema>;

  widgets?: Record<string, (props: PropPanelWidgetProps) => void>;
  defaultValue: string;
  defaultSchema: T;
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
  rootElement: HTMLDivElement;
  options: UIOptions;
};

export type Plugin<T extends Schema & { [key: string]: any }> = {
  pdf: (arg: PDFRenderProps<T>) => Promise<void>;
  ui: (arg: UIRenderProps<T>) => Promise<void>;
  propPanel: PropPanel<T>;
};

export type Plugins = { plugins?: { [key: string]: Plugin<Schema & { [key: string]: any }> } };

export type PDFRender = (arg: PDFRenderProps<Schema>) => Promise<void>;

export interface PDFRenderer {
  [key: string]: PDFRender | undefined;
}

export type UIRender = (arg: UIRenderProps<Schema>) => Promise<void>;

export interface UIRenderer {
  [key: string]: UIRender | undefined;
}

export interface PropPanelObject {
  [key: string]: PropPanel<Schema> | undefined;
}

export type Lang = z.infer<typeof Lang>;
export type Size = z.infer<typeof Size>;
export type Schema = z.infer<typeof Schema>;
export type SchemaInputs = z.infer<typeof SchemaInputs>;
export type SchemaForUI = z.infer<typeof SchemaForUI>;
export type Font = z.infer<typeof Font>;
export type BasePdf = z.infer<typeof BasePdf>;
export type Template = z.infer<typeof Template>;
export type GeneratorOptions = z.infer<typeof GeneratorOptions>;
export type GenerateProps = z.infer<typeof GenerateProps> & Plugins;
export type UIProps = z.infer<typeof UIProps> & Plugins;
export type PreviewProps = z.infer<typeof PreviewProps> & Plugins;
export type DesignerProps = z.infer<typeof DesignerProps> & Plugins;
export type UIOptions = z.infer<typeof UIOptions>;
export type PreviewReactProps = z.infer<typeof PreviewReactProps>;
export type DesignerReactProps = z.infer<typeof DesignerReactProps>;
