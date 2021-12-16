import ReactDOM from 'react-dom';
import { curriedI18n } from './i18n';
import { destroyedErrMsg } from './constants';

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

export interface PageSize {
  height: number;
  width: number;
}

interface SubsetFont {
  data: string | Uint8Array | ArrayBuffer;
  subset: boolean;
}

interface Font {
  [key: string]: string | Uint8Array | ArrayBuffer | SubsetFont;
}

export interface Args {
  inputs: { [key: string]: string }[];
  template: Template;
  font?: Font;
  splitThreshold?: number;
}

export const isPageSize = (args: PageSize | string | Uint8Array | ArrayBuffer): args is PageSize =>
  typeof args === 'object' && 'width' in args;

export const isSubsetFont = (v: string | Uint8Array | ArrayBuffer | SubsetFont): v is SubsetFont =>
  typeof v === 'object' && !!v && 'data' in v;

export interface Template {
  schemas: { [key: string]: TemplateSchema }[];
  basePdf: PageSize | string | Uint8Array | ArrayBuffer;
  fontName?: string;
  sampledata: { [key: string]: string }[];
  columns: string[];
}

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

interface UIBaseProps {
  template: Template;
  size: PageSize;
}

export interface TemplateDesignerProp extends UIBaseProps {
  saveTemplate: (template: Template) => void;
}

export type UIProps = { lang?: 'en' | 'ja'; domContainer: HTMLElement };

export abstract class BaseUIClass {
  protected domContainer: HTMLElement | null;

  protected template: Template;

  protected size: PageSize;

  private lang: 'en' | 'ja' = 'en';

  constructor(props: UIBaseProps & UIProps) {
    const { domContainer, template, size, lang } = props;
    this.domContainer = domContainer;
    this.template = template;
    this.size = size;
    this.lang = lang || 'en';
  }

  protected getI18n() {
    return curriedI18n(this.lang);
  }

  public destroy() {
    if (!this.domContainer) throw new Error(destroyedErrMsg);
    ReactDOM.unmountComponentAtNode(this.domContainer);
    this.domContainer = null;
  }

  protected abstract render(): void;
}

export interface PreviewUIProp extends UIBaseProps {
  inputs: { [key: string]: string }[];
  onChangeInput?: (arg: { index: number; value: string; key: string }) => void;
}
export abstract class PreviewUI extends BaseUIClass {
  protected inputs: { [key: string]: string }[];

  constructor(props: PreviewUIProp & UIProps) {
    const { domContainer, template, size, lang, inputs } = props;
    super({ domContainer, template, size, lang });

    this.inputs = inputs;
    this.render();
  }

  public getInputs() {
    if (!this.domContainer) throw new Error(destroyedErrMsg);

    return this.inputs;
  }

  public setInputs(inputs: { [key: string]: string }[]) {
    if (!this.domContainer) throw new Error(destroyedErrMsg);
    this.inputs = inputs;
    this.render();
  }

  protected abstract render(): void;
}
