import type {
  TemplateSchema as _TemplateSchema,
  Template as _Template,
  PageSize as _PageSize,
} from 'labelmake/dist/types/type';

export type PageSize = _PageSize;

export type TemplateSchema = _TemplateSchema;

export type Template = _Template & {
  sampledata: { [key: string]: string }[];
  columns: string[];
};

export type TemplateWithPages = Template & { pages: { size: PageSize; image: string }[] };

export type Schema = TemplateSchema & {
  id: string;
  key: string;
  data: string;
};

export type Lang = 'en' | 'ja';

export interface TemplateEditorProp {
  fetchTemplate: () => Promise<Template>;
  saveTemplate: (template: Template) => Promise<Template>;
  Header: React.ComponentType<EditorHeaderProp>;
}

export interface EditorHeaderProp {
  processing: boolean;
  template: Template;
  saveTemplate: (template: Template) => Promise<Template>;
  updateTemplate: (template: Template) => void;
  [prop: string]: any;
}

export interface GuidesInterface {
  getGuides(): number[];
  scroll(pos: number): void;
  scrollGuides(pos: number): void;
  loadGuides(guides: number[]): void;
  resize(): void;
}
