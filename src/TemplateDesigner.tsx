import React from 'react';
import ReactDOM from 'react-dom';
import { Template, TemplateDesignerProps } from './libs/type';
import { BaseUIClass } from './libs/class';
import { destroyedErrMsg } from './libs/constants';
import { I18nContext, FontContext } from './libs/contexts';
import TemplateDesignerComponent from './components/TemplateDesigner';

class TemplateDesigner extends BaseUIClass {
  private saveTemplateCallback: (t: Template) => void;

  constructor(props: TemplateDesignerProps) {
    TemplateDesignerProps.parse(props);
    const { domContainer, template, size, saveTemplate, options } = props;
    super({ domContainer, template, size, options });

    this.saveTemplateCallback = saveTemplate;
    this.render();
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

  render() {
    if (!this.domContainer) throw new Error(destroyedErrMsg);
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
