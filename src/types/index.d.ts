import type { TemplateSchema as _TemplateSchema } from 'labelmake/dist/types/type';

export type Lang = 'en' | 'ja';

export interface PageSize {
  height: number;
  width: number;
}

type Alignment = 'left' | 'right' | 'center';

export type TemplateSchema = _TemplateSchema;

export interface Template {
  basePdf: PageSize | string | Uint8Array | ArrayBuffer;
  columns: string[];
  sampledata: { [key: string]: string }[];
  schemas: { [key: string]: TemplateSchema }[];
  fontName: string;
}

export type Schema = TemplateSchema & {
  id: string;
  key: string;
  data: string;
};

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
  changeBasePdf: (file: File) => void;
  downloadBasePdf: (pdfName: string) => void;
  saveTemplate: (template: Template) => Promise<Template>;
  // --------base end------------
  previewPdf?: () => void;
  loadJsonTemplate?: (file: File) => void;
  handleChangeFontName?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
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
