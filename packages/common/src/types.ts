import { z } from 'zod';
import type { PDFPage, PDFDocument } from '@pdfme/pdf-lib';
import type { WidgetProps as _PropPanelWidgetProps, Schema as _PropPanelSchema } from 'form-render';
import {
  Lang,
  Size,
  Schema,
  Font,
  SchemaForUI,
  BasePdf,
  Template,
  GeneratorOptions,
  GenerateProps,
  UIOptions,
  UIProps,
  PreviewProps,
  DesignerProps,
} from './schema.js';

export type PropPanelSchema = _PropPanelSchema;
export type ChangeSchemas = (objs: { key: string; value: any; schemaId: string }[]) => void;

// FIXME 書く
export interface PDFRenderProps<T extends Schema> {
  value: string;
  schema: T;
  pdfLib: typeof import('@pdfme/pdf-lib');
  pdfDoc: PDFDocument;
  page: PDFPage;
  options: GeneratorOptions;

  _cache: Map<string, any>;
}

// FIXME 書く
export type UIRenderProps<T extends Schema> = {
  schema: SchemaForUI & T;
  mode: 'viewer' | 'form' | 'designer';
  tabIndex?: number;
  placeholder?: string;
  stopEditing?: () => void;
  value: string;
  onChange?: (value: string) => void;
  rootElement: HTMLDivElement;
  options: UIOptions;
};

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

// FIXME 書く
export interface PropPanel<T extends Schema> {
  propPanelSchema:
    | ((propPanelProps: Omit<PropPanelProps, 'rootElement'>) => Record<string, PropPanelSchema>)
    | Record<string, PropPanelSchema>;

  widgets?: Record<string, (props: PropPanelWidgetProps) => void>;
  defaultValue: string;
  defaultSchema: T;
}

// FIXME 書く
/**
 * Plugin インターフェースは PDF と UI のレンダリング、
 * およびプロパティパネルの定義に使用されます。
 * @template T 拡張された Schema オブジェクトの型
 * @property {function} pdf PDF のレンダリングを行う関数
 * @property {function} ui UI のレンダリングを行う関数
 * @property {PropPanel} propPanel プロパティパネルの定義
 */
export type Plugin<T extends Schema & { [key: string]: any }> = {
  pdf: (arg: PDFRenderProps<T>) => Promise<void>;
  ui: (arg: UIRenderProps<T>) => Promise<void>;
  propPanel: PropPanel<T>;
};

export type Plugins = { [key: string]: Plugin<any> | undefined };

export type Lang = z.infer<typeof Lang>;
export type Size = z.infer<typeof Size>;
export type Schema = z.infer<typeof Schema>;
export type SchemaForUI = z.infer<typeof SchemaForUI>;
export type Font = z.infer<typeof Font>;
export type BasePdf = z.infer<typeof BasePdf>;
export type Template = z.infer<typeof Template>;
export type GeneratorOptions = z.infer<typeof GeneratorOptions>;
export type GenerateProps = z.infer<typeof GenerateProps> & { plugins?: Plugins };
export type UIOptions = z.infer<typeof UIOptions>;
export type UIProps = z.infer<typeof UIProps> & { plugins?: Plugins };
export type PreviewProps = z.infer<typeof PreviewProps> & { plugins?: Plugins };
export type DesignerProps = z.infer<typeof DesignerProps> & { plugins?: Plugins };
