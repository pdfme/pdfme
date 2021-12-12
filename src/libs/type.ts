import type {
  TemplateSchema as _TemplateSchema,
  Template as _Template,
  PageSize as _PageSize,
} from 'labelmake/dist/types/type';
import ReactDOM from 'react-dom';
import { curriedI18n } from './i18n';
import { destroyedErrMsg } from './constants';

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
