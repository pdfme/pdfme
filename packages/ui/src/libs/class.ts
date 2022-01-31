import ReactDOM from 'react-dom';
import { curriedI18n } from './i18n';
import { DESTROYED_ERR_MSG, DEFAULT_LANG } from '../../../common/src/constants';
import { Template, Size, Lang, Font, UIProps, PreviewProps, UIOptions } from '../../../common/src/type';
import { getDefaultFont, checkProps, generateColumnsAndSampledataIfNeeded } from '../../../common/src/helper';
import { debounce } from '../../../common/src/utils';

interface CommonConstructor {
  domContainer: HTMLElement;
  template: Template;
  options?: UIOptions;
}
export type DesignerConstructor = CommonConstructor;

export type PreviewUIConstructor = CommonConstructor & {
  inputs: { [key: string]: string }[];
};

export abstract class BaseUIClass {
  protected domContainer!: HTMLElement | null;

  protected template!: Template;

  protected size!: Size;

  private readonly lang: Lang = DEFAULT_LANG;

  private readonly font: Font = getDefaultFont();

  private readonly setSize = debounce(() => {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    this.size = {
      height: this.domContainer.clientHeight || window.innerHeight,
      width: this.domContainer.clientWidth || window.innerWidth,
    };
    this.render();
  }, 100);

  constructor(props: UIProps) {
    checkProps(props, UIProps);

    const { domContainer, template, options } = props;
    const { lang, font } = options || {};
    this.domContainer = domContainer;
    this.template = generateColumnsAndSampledataIfNeeded(template);
    this.size = {
      height: this.domContainer.clientHeight || window.innerHeight,
      width: this.domContainer.clientWidth || window.innerWidth,
    };
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

  public getTemplate() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);

    return this.template;
  }

  public updateTemplate(template: Template) {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    this.template = template;
    this.render();
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
  protected inputs!: { [key: string]: string }[];

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
