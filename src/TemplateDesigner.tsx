import React from 'react';
import ReactDOM from 'react-dom';
import { Template, TemplateDesignerProps, UIOptions } from './libs/type';
import { checkProps } from './libs/helper';
import { BaseUIClass } from './libs/class';
import { DESTROYED_ERR_MSG } from './libs/constants';
import { I18nContext, FontContext } from './libs/contexts';
import TemplateDesignerComponent from './components/TemplateDesigner';

class TemplateDesigner extends BaseUIClass {
  private saveTemplateCallback!: (t: Template) => void;
  private onChangeTemplateCallback: (t: Template) => void = () => {
    ('nope');
  };

  constructor(props: {
    template: Template;
    domContainer: HTMLElement;
    saveTemplate: (t: Template) => void;
    options?: UIOptions;
  }) {
    super(props);
    checkProps(props, TemplateDesignerProps);

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
          <TemplateDesignerComponent
            template={this.template}
            saveTemplate={this.saveTemplateCallback}
            onChangeTemplate={(template) => {
              this.template = template;
              this.onChangeTemplateCallback(template);
            }}
            size={this.size}
          />
        </FontContext.Provider>
      </I18nContext.Provider>,
      this.domContainer
    );
  }
}

export default TemplateDesigner;
