import React from 'react';
import ReactDOM from 'react-dom';
import { PreviewUI } from './libs/class';
import { PreviewProps } from './libs/type';
import { destroyedErrMsg } from './libs/constants';
import { I18nContext, FontContext } from './libs/contexts';
import Preview from './components/Preview';

class Form extends PreviewUI {
  private onChangeInputCallback?: (arg: { index: number; value: string; key: string }) => void;

  constructor(props: PreviewProps) {
    PreviewProps.parse(props);
    const { domContainer, template, size, inputs, onChangeInput, options } = props;
    super({ domContainer, template, size, inputs, options });

    if (onChangeInput) {
      this.onChangeInputCallback = onChangeInput;
    }
  }

  render() {
    if (!this.domContainer) throw new Error(destroyedErrMsg);
    ReactDOM.render(
      <I18nContext.Provider value={this.getI18n()}>
        <FontContext.Provider value={this.getFont()}>
          <Preview
            template={this.template}
            size={this.size}
            inputs={this.inputs}
            onChangeInput={(arg: { index: number; value: string; key: string }) => {
              const { index, value, key } = arg;
              if (this.onChangeInputCallback) {
                this.onChangeInputCallback({ index, value, key });
              }
              this.inputs[index][key] = value;
              this.render();
            }}
          />
        </FontContext.Provider>
      </I18nContext.Provider>,
      this.domContainer
    );
  }
}

export default Form;
