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

export type Schema = TemplateSchema & {
  id: string;
  key: string;
  data: string;
};

export type Lang = 'en' | 'ja';

export interface TemplateEditorProp {
  lang: Lang;
  fetchTemplate: () => Promise<Template>;
  saveTemplate: (template: Template) => Promise<Template>;
  EditorCtl: React.ComponentType<TemplateEditorCtlProp>;
}

export interface TemplateEditorCtlProp {
  // --------base start------------
  processing: boolean;
  template: Template;
  schemas: Schema[][];
  // editorにsetStateする処理として抽象化したPropを追加するか下記で行う
  [prop: string]: any;
  changeBasePdf: (file: File) => void; // TODO editorにsetStateする処理として抽象化
  downloadBasePdf: (pdfName: string) => void;
  saveTemplate: (template: Template) => Promise<Template>;
  // --------base end------------
  previewPdf?: () => void;
  loadJsonTemplate?: (file: File) => void; // TODO editorにsetStateする処理として抽象化
  handleChangeFontName?: (event: React.ChangeEvent<HTMLSelectElement>) => void; // TODO editorにsetStateする処理として抽象化
  preview?: boolean;
  togglePreview?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export interface GuidesInterface {
  getGuides(): number[];
  scroll(pos: number): void;
  scrollGuides(pos: number): void;
  loadGuides(guides: number[]): void;
  resize(): void;
}
