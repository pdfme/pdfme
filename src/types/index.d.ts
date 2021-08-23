import type { TemplateSchema as _TemplateSchema } from 'labelmake/dist/types/type';
declare global {
  interface Window {
    Canva: any;
  }
}

export type Lang = 'en' | 'ja';

export interface PageSize {
  height: number;
  width: number;
}

type Alignment = 'left' | 'right' | 'center';

export type TemplateSchema = _TemplateSchema;

export interface Template {
  canvaId?: string;
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

export interface SaveTemplateArg {
  isSaveAs: boolean;
  template: Template;
  schemas: Schema[][];
}

export interface TemplateEditorProp {
  lang: Lang;
  initTemplate: () => Promise<Template>;
  saveTemplate: (saveTemplateArg: SaveTemplateArg) => Promise<void | Template>;
  EditorCtl: React.ComponentType<TemplateEditorCtlProp>;
}

export interface TemplateEditorCtlProp {
  // --------base start------------
  processing: boolean;
  template: Template;
  schemas: Schema[][];
  changeCanvaId: (canvaId: string) => void;
  changeBasePdf: (file: File) => void;
  downloadBasePdf: (pdfName: string) => void;
  saveTemplate: (saveTemplateArg: SaveTemplateArg) => Promise<Template | void>;
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
