import React from 'react';
import TemplateDesignerComponent from './TemplateDesigner';
import ViewerComponent from './Viewer';
import FormComponent from './Form';
import ReactDOM from 'react-dom';
import { TemplateDesignerProp, PreviewProp, PageSize, Template } from './libs/type';
import { blankPdf } from './libs/constants';
import { I18nContext, curriedI18n } from './libs/i18n';

const destroyedErrMsg = 'already destroyed';
class TemplateDesigner {
  private domContainer: HTMLElement | null;

  private template: Template;

  private size: PageSize;

  private lang: 'en' | 'ja' = 'en';

  private saveTemplateCallback: (t: Template) => void;

  constructor(props: TemplateDesignerProp & { lang?: 'en' | 'ja'; domContainer: HTMLElement }) {
    const { domContainer, template, size, lang, saveTemplate } = props;
    this.domContainer = domContainer;
    this.template = template;
    this.size = size;
    this.lang = lang || 'en';
    this.saveTemplateCallback = saveTemplate;
    this.render();
  }

  public destroy() {
    if (!this.domContainer) throw new Error(destroyedErrMsg);
    ReactDOM.unmountComponentAtNode(this.domContainer);
    this.domContainer = null;
  }

  public saveTemplate() {
    if (!this.domContainer) throw new Error(destroyedErrMsg);
    this.saveTemplateCallback(this.template);
  }

  public updateTemplate(template: Template) {
    if (!this.domContainer) throw new Error(destroyedErrMsg);
    this.template = template;
    this.render();
  }

  private render() {
    if (!this.domContainer) throw new Error(destroyedErrMsg);
    const i18n = curriedI18n(this.lang);
    ReactDOM.render(
      <I18nContext.Provider value={i18n}>
        <TemplateDesignerComponent
          template={this.template}
          saveTemplate={this.saveTemplateCallback}
          size={this.size}
          onChangeTemplate={(template) => {
            this.template = template;
          }}
        />
      </I18nContext.Provider>,
      this.domContainer
    );
  }
}

class Viewer {
  private domContainer: HTMLElement | null;

  private template: Template;

  private size: PageSize;

  private lang: 'en' | 'ja' = 'en';

  private inputs: { [key: string]: string }[];

  constructor(props: PreviewProp & { lang?: 'en' | 'ja'; domContainer: HTMLElement }) {
    const { domContainer, template, size, lang, inputs } = props;
    this.domContainer = domContainer;
    this.template = template;
    this.size = size;
    this.lang = lang || 'en';
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

  public destroy() {
    if (!this.domContainer) throw new Error(destroyedErrMsg);
    ReactDOM.unmountComponentAtNode(this.domContainer);
    this.domContainer = null;
  }

  private render() {
    if (!this.domContainer) throw new Error(destroyedErrMsg);
    const i18n = curriedI18n(this.lang);
    ReactDOM.render(
      <I18nContext.Provider value={i18n}>
        <ViewerComponent template={this.template} size={this.size} inputs={this.inputs} />
      </I18nContext.Provider>,
      this.domContainer
    );
  }
}

class Form {
  private domContainer: HTMLElement | null;

  private template: Template;

  private size: PageSize;

  private lang: 'en' | 'ja' = 'en';

  private inputs: { [key: string]: string }[];

  constructor(props: PreviewProp & { lang?: 'en' | 'ja'; domContainer: HTMLElement }) {
    const { domContainer, template, size, lang, inputs } = props;
    this.domContainer = domContainer;
    this.template = template;
    this.size = size;
    this.lang = lang || 'en';
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

  public destroy() {
    if (!this.domContainer) throw new Error(destroyedErrMsg);
    ReactDOM.unmountComponentAtNode(this.domContainer);
    this.domContainer = null;
  }

  private render() {
    if (!this.domContainer) throw new Error(destroyedErrMsg);
    const i18n = curriedI18n(this.lang);
    ReactDOM.render(
      <I18nContext.Provider value={i18n}>
        <FormComponent
          template={this.template}
          size={this.size}
          inputs={this.inputs}
          onChange={({ index, value, key }: { index: number; value: string; key: string }) => {
            this.inputs[index][key] = value;
            this.render();
          }}
        />
      </I18nContext.Provider>,
      this.domContainer
    );
  }
}

export default { TemplateDesigner, Viewer, Form, blankPdf };
export { TemplateDesigner, Viewer, Form, blankPdf };
