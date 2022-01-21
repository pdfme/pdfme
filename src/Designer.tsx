import React from 'react';
import ReactDOM from 'react-dom';
import { Template, DesignerProps } from './libs/type';
import { checkProps } from './libs/helper';
import { BaseUIClass, DesignerConstructor } from './libs/class';
import { DESTROYED_ERR_MSG } from './libs/constants';
import { I18nContext, FontContext } from './libs/contexts';
import DesignerComponent from './components/Designer';

class Designer extends BaseUIClass {
  private onSaveTemplateCallback?: (t: Template) => void;
  private onChangeTemplateCallback?: (t: Template) => void;

  constructor(props: DesignerConstructor) {
    super(props);
    checkProps(props, DesignerProps);

    this.render();
  }

  public saveTemplate() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    if (this.onSaveTemplateCallback) {
      this.onSaveTemplateCallback(this.template);
    }
  }

  public onSaveTemplate(cb: (t: Template) => void) {
    this.onSaveTemplateCallback = cb;
  }

  public onChangeTemplate(cb: (t: Template) => void) {
    this.onChangeTemplateCallback = cb;
  }

  protected render() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    ReactDOM.render(
      <I18nContext.Provider value={this.getI18n()}>
        <FontContext.Provider value={this.getFont()}>
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
        </FontContext.Provider>
      </I18nContext.Provider>,
      this.domContainer
    );
  }
}

export default Designer;
