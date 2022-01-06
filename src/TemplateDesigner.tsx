import React from 'react';
import ReactDOM from 'react-dom';
import { Template, TemplateDesignerProps } from './libs/type';
import { checkProps } from './libs/helper';
import { BaseUIClass } from './libs/class';
import { DESTROYED_ERR_MSG } from './libs/constants';
import { I18nContext, FontContext } from './libs/contexts';
import TemplateDesignerComponent from './components/TemplateDesigner';

class TemplateDesigner extends BaseUIClass {
  private saveTemplateCallback: (t: Template) => void;

  constructor(props: TemplateDesignerProps) {
    super(props);
    checkProps(props, TemplateDesignerProps);

    this.saveTemplateCallback = props.saveTemplate;
    this.render();
  }

  public saveTemplate() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    this.saveTemplateCallback(this.template);
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

  render() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    ReactDOM.render(
      <I18nContext.Provider value={this.getI18n()}>
        <FontContext.Provider value={this.getFont()}>
          <TemplateDesignerComponent
            template={this.template}
            saveTemplate={this.saveTemplateCallback}
            size={this.size}
            onChangeTemplate={(template) => {
              this.template = template;
            }}
          />
        </FontContext.Provider>
      </I18nContext.Provider>,
      this.domContainer
    );
  }
}

export default TemplateDesigner;
