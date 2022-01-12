import ReactDOM from 'react-dom';
import { curriedI18n } from './i18n';
import { DESTROYED_ERR_MSG, DEFAULT_LANG } from './constants';
import { Template, Size, Lang, Font, UIProps, PreviewProps } from './type';
import { getDefaultFont, checkProps, generateColumnsAndSampledataIfNeeded } from './helper';

export abstract class BaseUIClass {
  protected domContainer: HTMLElement | null;

  protected template: Template;

  protected size: Size = { height: 0, width: 0 };

  private lang: Lang = DEFAULT_LANG;

  private font: Font = getDefaultFont();

  private setSize = () => {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    this.size = {
      height: this.domContainer.offsetHeight || window.innerHeight,
      width: this.domContainer.offsetWidth || window.innerWidth,
    };
    this.render();
  };

  constructor(props: UIProps) {
    checkProps(props, UIProps);

    const { domContainer, template, options } = props;
    const { lang, font } = options || {};
    this.domContainer = domContainer;
    this.template = generateColumnsAndSampledataIfNeeded(template);
    this.setSize();
    window.addEventListener('resize', this.setSize);

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
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    ReactDOM.unmountComponentAtNode(this.domContainer);
    this.domContainer = null;
    window.removeEventListener('resize', this.setSize);
  }

  protected abstract render(): void;
}
export abstract class PreviewUI extends BaseUIClass {
  protected inputs: { [key: string]: string }[];

  constructor(props: PreviewProps) {
    super(props);
    checkProps(props, PreviewProps);

    this.inputs = props.inputs;
    this.render();
  }

  public getInputs() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);

    return this.inputs;
  }

  public setInputs(inputs: { [key: string]: string }[]) {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    this.inputs = inputs;
    this.render();
  }

  protected abstract render(): void;
}
