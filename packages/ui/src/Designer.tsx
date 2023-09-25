import React from 'react';
import ReactDOM from 'react-dom';
import { Template, DesignerProps, checkDesignerProps, checkTemplate } from '@pdfme/common';
import { BaseUIClass } from './class';
import { DESTROYED_ERR_MSG } from './constants';
import { I18nContext, FontContext, RendererRegistry, OptionsContext } from './contexts';
import DesignerComponent from './components/Designer/index';
import { cloneDeep } from './helper';

class Designer extends BaseUIClass {
  private onSaveTemplateCallback?: (template: Template) => void;
  private onChangeTemplateCallback?: (template: Template) => void;

  constructor(props: DesignerProps) {
    super(props);
    checkDesignerProps(props);

    {/* TODO set propEditor from the propertyPanelRegistry here */ }

    this.render();
  }

  public saveTemplate() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    if (this.onSaveTemplateCallback) {
      this.onSaveTemplateCallback(this.template);
    }
  }

  public updateTemplate(template: Template) {
    checkTemplate(template);
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    this.template = cloneDeep(template);
    if (this.onChangeTemplateCallback) {
      this.onChangeTemplateCallback(template);
    }
    this.render();
  }

  public onSaveTemplate(cb: (template: Template) => void) {
    this.onSaveTemplateCallback = cb;
  }

  public onChangeTemplate(cb: (template: Template) => void) {
    this.onChangeTemplateCallback = cb;
  }

  protected render() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    ReactDOM.render(
      <I18nContext.Provider value={this.getI18n()}>
        <FontContext.Provider value={this.getFont()}>
          <RendererRegistry.Provider value={this.getRendererRegistry()}>
            <OptionsContext.Provider value={this.getOptions()}>
              <DesignerComponent
                template={this.template}
                onSaveTemplate={(template) => {
                  this.template = template;
                  if (this.onSaveTemplateCallback) {
                    this.onSaveTemplateCallback(template);
                  }
                }}
                onChangeTemplate={(template) => {
                  this.template = template;
                  if (this.onChangeTemplateCallback) {
                    this.onChangeTemplateCallback(template);
                  }
                }}
                size={this.size}
              />
            </OptionsContext.Provider>
          </RendererRegistry.Provider>
        </FontContext.Provider>
      </I18nContext.Provider>,
      this.domContainer
    );
  }
}

export default Designer;
