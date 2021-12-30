import ReactDOM from 'react-dom';
import { curriedI18n } from './i18n';
import { destroyedErrMsg, defaultFont, defaultLang } from './constants';
import { Template, PageSize, Lang, Font, UIProps, PreviewProps } from './type';
import { checkFont, getFontNamesInSchemas } from './utils';

export abstract class BaseUIClass {
  protected domContainer: HTMLElement | null;

  protected template: Template;

  protected size: PageSize;

  private lang: Lang = defaultLang;

  private font: Font = defaultFont;

  constructor(props: UIProps) {
    UIProps.parse(props);

    const { domContainer, template, size, options } = props;
    const { lang, font } = options || {};
    this.domContainer = domContainer;
    this.template = template;
    this.size = size;
    if (lang) {
      this.lang = lang;
    }
    if (font) {
      const fontNamesInSchemas = getFontNamesInSchemas(template.schemas);
      checkFont({ font, fontNamesInSchemas });
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

  constructor(props: PreviewProps) {
    PreviewProps.parse(props);
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
