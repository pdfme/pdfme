import React from 'react';
import ReactDOM from 'react-dom';
import { PreviewUIProp, PreviewUI, UIProps } from './libs/type';
import { destroyedErrMsg } from './libs/constants';
import { I18nContext } from './libs/i18n';
import Preview from './components/Preview';

class Form extends PreviewUI {
  private onChangeInputCallback?: (arg: { index: number; value: string; key: string }) => void;

  constructor(props: PreviewUIProp & UIProps) {
    const { domContainer, template, size, lang, inputs, onChangeInput } = props;
    super({ domContainer, template, size, lang, inputs });

    if (onChangeInput) {
      this.onChangeInputCallback = onChangeInput;
    }
  }

  render() {
    if (!this.domContainer) throw new Error(destroyedErrMsg);
    ReactDOM.render(
      <I18nContext.Provider value={this.getI18n()}>
        <Preview
          template={this.template}
          size={this.size}
          inputs={this.inputs}
          onChangeInput={({ index, value, key }: { index: number; value: string; key: string }) => {
            if (this.onChangeInputCallback) {
              this.onChangeInputCallback({ index, value, key });
            }
            this.inputs[index][key] = value;
            this.render();
          }}
        />
      </I18nContext.Provider>,
      this.domContainer
    );
  }
}

export default Form;
