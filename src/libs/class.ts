import ReactDOM from 'react-dom';
import { curriedI18n } from './i18n';
import { destroyedErrMsg, defaultFont, defaultLang } from './constants';
import { Template, PageSize, Lang, Font } from './type';

export interface UIProps {
  domContainer: HTMLElement;
  template: Template;
  size: PageSize;
  options?: { lang?: Lang; font?: Font };
}

export abstract class BaseUIClass {
  protected domContainer: HTMLElement | null;

  protected template: Template;

  protected size: PageSize;

  private lang: Lang = defaultLang;

  private font: Font = defaultFont;

  constructor(props: UIProps) {
    // TODO ここから ここでランタイムの型チェックをしたい
    const { domContainer, template, size, options } = props;
    const { lang, font } = options || {};
    this.domContainer = domContainer;
    this.template = template;
    this.size = size;
    if (lang) {
      this.lang = lang;
    }
    if (font) {
      this.font = font;
    }
  }

  protected getI18n() {
    return curriedI18n(this.lang);
  }

  protected getFont() {
    return this.font;
  }

  public destroy() {
    if (!this.domContainer) throw new Error(destroyedErrMsg);
    ReactDOM.unmountComponentAtNode(this.domContainer);
    this.domContainer = null;
  }

  protected abstract render(): void;
}

export interface TemplateDesignerProp extends Omit<UIProps, 'domContainer'> {
  saveTemplate: (template: Template) => void;
}

export interface PreviewUIProp extends Omit<UIProps, 'domContainer'> {
  inputs: { [key: string]: string }[];
  onChangeInput?: (arg: { index: number; value: string; key: string }) => void;
}

export abstract class PreviewUI extends BaseUIClass {
  protected inputs: { [key: string]: string }[];

  constructor(props: PreviewUIProp & UIProps) {
    const { domContainer, template, size, inputs, options } = props;
    super({ domContainer, template, size, options });

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
