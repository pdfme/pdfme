import { PDFImage } from 'pdf-lib';

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

export type BarCodeType = Exclude<TemplateType, 'text' | 'image'>;

export type Alignment = 'left' | 'right' | 'center';

export interface InputImageCache {
  [key: string]: PDFImage;
}
export interface PageSize {
  height: number;
  width: number;
}

interface SubsetFont {
  data: string | Uint8Array | ArrayBuffer;
  subset: boolean;
}

export const isSubsetFont = (v: FontValue): v is SubsetFont =>
  typeof v === 'object' && !!v && 'data' in v;

type FontValue = string | Uint8Array | ArrayBuffer | SubsetFont;

// TODO  Fontの型とUIPropsのfontは共通化させたいのと、複数を配列で持つようにする？
export interface Font {
  [key: string]: FontValue;
}

export type Schemas = { [key: string]: TemplateSchema }[];

export type BasePdf = PageSize | string | Uint8Array | ArrayBuffer;

export const isPageSize = (arg: BasePdf): arg is PageSize =>
  typeof arg === 'object' && 'width' in arg;

// TODO 下手にtemplateにfontNameを持たせずにoptionで管理する？
export interface Template {
  schemas: Schemas;
  basePdf: BasePdf;
  fontName?: string;
  sampledata?: { [key: string]: string }[];
  columns?: string[];
}

// TODO 画像やバーコードにはfontColorが使えないので無駄なプロパティ。typeで制御したい。
export interface TemplateSchema {
  type: TemplateType;
  position: { x: number; y: number };
  width: number;
  height: number;
  rotate?: number;
  alignment?: Alignment;
  fontSize?: number;
  fontName?: string;
  fontColor?: string;
  backgroundColor?: string;
  characterSpacing?: number;
  lineHeight?: number;
}

export type SchemaUIProp = {
  schema: Schema;
  editable: boolean;
  placeholder: string;
  tabIndex: number;
  onChange: (value: string) => void;
};

export type Schema = TemplateSchema & {
  id: string;
  key: string;
  data: string;
};

export type Lang = 'en' | 'ja';

export interface GuidesInterface {
  getGuides(): number[];
  scroll(pos: number): void;
  scrollGuides(pos: number): void;
  loadGuides(guides: number[]): void;
  resize(): void;
}

export interface GenerateArg {
  inputs: { [key: string]: string }[];
  template: Template;
  options?: { font?: Font; splitThreshold?: number };
}
