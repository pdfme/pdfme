import React from 'react';
import ReactDOM from 'react-dom';
import {
  Template,
  DesignerProps,
  checkDesignerProps,
  checkTemplate,
  PDFME_VERSION,
} from '@pdfme/common';
import { BaseUIClass } from './class';
import { DESTROYED_ERR_MSG } from './constants.js';
import DesignerComponent from './components/Designer/index';
import AppContextProvider from './components/AppContextProvider';
import { cloneDeep } from './helper.js';

class Designer extends BaseUIClass {
  private onSaveTemplateCallback?: (template: Template) => void;
  private onChangeTemplateCallback?: (template: Template) => void;
  private pageCursor: number = 0;

  constructor(props: DesignerProps) {
    super(props);
    checkDesignerProps(props);
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
  
  public getPageCursor() {
    return this.pageCursor
  }

  protected render() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    ReactDOM.render(
      <AppContextProvider
        lang={this.getLang()}
        font={this.getFont()}
        plugins={this.getPluginsRegistry()}
        options={this.getOptions()}
      >
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
            this.template.pdfmeVersion = PDFME_VERSION;
            if (this.onChangeTemplateCallback) {
              this.onChangeTemplateCallback(template);
            }
          }}
          onPageCursorChange={(newPageCursor: number) => {
            this.pageCursor = newPageCursor
          }}
          size={this.size}
        />
      </AppContextProvider>,
      this.domContainer
    );
  }
}

export default Designer;
