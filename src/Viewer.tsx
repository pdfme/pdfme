import React from 'react';
import ReactDOM from 'react-dom';
import { PreviewUI } from './libs/class';
import { Template, UIOptions } from './libs/type';
import { DESTROYED_ERR_MSG } from './libs/constants';
import { I18nContext, FontContext } from './libs/contexts';
import Preview from './components/Preview';

class Viewer extends PreviewUI {
  constructor(props: {
    domContainer: HTMLElement;
    template: Template;
    inputs: { [key: string]: string }[];
    options?: UIOptions;
  }) {
    super({ ...props });
  }

  protected render() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    ReactDOM.render(
      <I18nContext.Provider value={this.getI18n()}>
        <FontContext.Provider value={this.getFont()}>
          <Preview template={this.template} size={this.size} inputs={this.inputs} />
        </FontContext.Provider>
      </I18nContext.Provider>,
      this.domContainer
    );
  }
}

export default Viewer;
