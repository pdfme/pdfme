declare module '*.css';
declare module '*.scss';

declare module '*.png' {
  const value: any;
  export = value;
}

declare module '*.svg' {
  const content: any;
  export default content;
}
declare module '*.module.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.module.scss' {
  const content: { [className: string]: string };
  export default content;
}

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

type TemplateType =
  | 'text'
  | 'image'
  | 'qrcode'
  | 'japanpost'
  | 'ean13'
  | 'ean8'
  | 'code39'
  | 'code128'
  | 'nw7'
  | 'itf14'
  | 'upca'
  | 'upce';

type Alignment = 'left' | 'right' | 'center';

// TODO labelmakeのtypeを使うようにするべき
export interface TemplateSchema {
  type: TemplateType;
  position: { x: number; y: number };
  width: number;
  height: number;
  alignment: Alignment;
  fontSize: number;
  characterSpacing: number;
  lineHeight: number;
  rotate?: number;
  fontName?: string;
  fontColor?: string;
  backgroundColor?: string;
}

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
