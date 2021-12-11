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

interface BaseProps {
  template: Template;
  size: PageSize;
}

export interface TemplateEditorProp extends BaseProps {
  saveTemplate: (template: Template) => void;
}

export interface PreviewProp extends BaseProps {
  inputs: { [key: string]: string }[];
}

export interface GuidesInterface {
  getGuides(): number[];
  scroll(pos: number): void;
  scrollGuides(pos: number): void;
  loadGuides(guides: number[]): void;
  resize(): void;
}
