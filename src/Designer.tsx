import React from 'react';
import ReactDOM from 'react-dom';
import { Template, DesignerProps, UIOptions } from './libs/type';
import { checkProps } from './libs/helper';
import { BaseUIClass } from './libs/class';
import { DESTROYED_ERR_MSG } from './libs/constants';
import { I18nContext, FontContext } from './libs/contexts';
import DesignerComponent from './components/Designer';

class Designer extends BaseUIClass {
  private saveTemplateCallback!: (t: Template) => void;
  private onChangeTemplateCallback?: (t: Template) => void;

  constructor(props: {
    template: Template;
    domContainer: HTMLElement;
    saveTemplate: (t: Template) => void;
    options?: UIOptions;
  }) {
    super(props);
    checkProps(props, DesignerProps);

    this.saveTemplateCallback = props.saveTemplate;
    this.render();
  }

  public saveTemplate() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    this.saveTemplateCallback(this.template);
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
            saveTemplate={this.saveTemplateCallback}
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
