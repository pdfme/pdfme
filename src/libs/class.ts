import ReactDOM from 'react-dom';
import { curriedI18n } from './i18n';
import { destroyedErrMsg, DEFAULT_LANG } from './constants';
import { Template, PageSize, Lang, Font, UIProps, PreviewProps } from './type';
import { getDefaultFont, checkProps, generateColumnsAndSampledataIfNeeded } from './helper';

export abstract class BaseUIClass {
  protected domContainer: HTMLElement | null;

  protected template: Template;

  protected size: PageSize;

  private lang: Lang = DEFAULT_LANG;

  private font: Font = getDefaultFont();

  constructor(props: UIProps) {
    checkProps(props, UIProps);

    const { domContainer, template, size, options } = props;
    const { lang, font } = options || {};
    this.domContainer = domContainer;
    this.template = generateColumnsAndSampledataIfNeeded(template);
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

  constructor(props: PreviewProps) {
    super({ ...props });
    checkProps(props, PreviewProps);

    this.inputs = props.inputs;
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
