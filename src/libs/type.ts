import type {
  TemplateSchema as _TemplateSchema,
  Template as _Template,
  PageSize as _PageSize,
} from 'labelmake/dist/types/type';

export type PageSize = _PageSize;

export type TemplateSchema = _TemplateSchema;

export type SchemaUIProp = {
  schema: Schema;
  editable: boolean;
  placeholder: string;
  tabIndex: number;
  onChange: (value: string) => void;
};

export type Template = _Template & {
  sampledata: { [key: string]: string }[];
  columns: string[];
};

export type Schema = TemplateSchema & {
  id: string;
  key: string;
  data: string;
};

export type Lang = 'en' | 'ja';

export interface TemplateEditorProp {
  template: Template;
  saveTemplate: (template: Template) => Promise<Template>;
  size: PageSize;
  Header: React.ComponentType<TemplateDesignerHeaderProp>;
}

export interface TemplateDesignerHeaderProp {
  processing: boolean;
  template: Template;
  saveTemplate: (template: Template) => Promise<Template>;
  updateTemplate: (template: Template) => void;
  [prop: string]: any;
}

export interface PreviewProp {
  template: Template;
  inputs: { [key: string]: string }[];
  size: PageSize;
  onChange?: (arg: { index: number; value: string; key: string }) => void;
}

export interface GuidesInterface {
  getGuides(): number[];
  scroll(pos: number): void;
  scrollGuides(pos: number): void;
  loadGuides(guides: number[]): void;
  resize(): void;
}
