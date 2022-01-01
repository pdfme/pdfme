import React from 'react';
import ReactDOM from 'react-dom';
import { PreviewUI } from './libs/class';
import { PreviewProps } from './libs/type';
import { destroyedErrMsg } from './libs/constants';
import { I18nContext, FontContext } from './libs/contexts';
import Preview from './components/Preview';

class Viewer extends PreviewUI {
  constructor(props: PreviewProps) {
    super({ ...props });
  }

  render() {
    if (!this.domContainer) throw Error(destroyedErrMsg);
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
