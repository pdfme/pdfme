import ReactDOM from 'react-dom';
import { curriedI18n } from './i18n';
import { destroyedErrMsg, defaultFont } from './constants';
import { Template, PageSize } from './type';

interface UIBaseProps {
  template: Template;
  size: PageSize;
}

export type UIProps = {
  domContainer: HTMLElement;
  lang?: 'en' | 'ja';
  // TODO type.tsのFontと共通化させたいのと、複数のFontに対応したい
  font?: { label: string; value: string };
};

export abstract class BaseUIClass {
  protected domContainer: HTMLElement | null;

  protected template: Template;

  protected size: PageSize;

  private lang: 'en' | 'ja' = 'en';

  private font: { label: string; value: string } = defaultFont;

  constructor(props: UIBaseProps & UIProps) {
    const { domContainer, template, size, lang, font } = props;
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

export abstract class PreviewUI extends BaseUIClass {
  protected inputs: { [key: string]: string }[];

  constructor(props: PreviewUIProp & UIProps) {
    const { domContainer, template, size, lang, inputs, font } = props;
    super({ domContainer, template, size, lang, font });

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

export interface TemplateDesignerProp extends UIBaseProps {
  saveTemplate: (template: Template) => void;
}

export interface PreviewUIProp extends UIBaseProps {
  inputs: { [key: string]: string }[];
  onChangeInput?: (arg: { index: number; value: string; key: string }) => void;
}
