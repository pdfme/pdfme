import React from 'react';
import ReactDOM from 'react-dom';
import { PreviewUIProp, PreviewUI, UIProps } from './libs/type';
import { destroyedErrMsg } from './libs/constants';
import { I18nContext } from './libs/i18n';
import Preview from './components/Preview';

class Viewer extends PreviewUI {
  constructor(props: PreviewUIProp & UIProps) {
    const { domContainer, template, size, lang, inputs } = props;
    super({ domContainer, template, size, lang, inputs });
  }

  render() {
    if (!this.domContainer) throw new Error(destroyedErrMsg);
    ReactDOM.render(
      <I18nContext.Provider value={this.getI18n()}>
        <Preview template={this.template} size={this.size} inputs={this.inputs} />
      </I18nContext.Provider>,
      this.domContainer
    );
  }
}

export default Viewer;
