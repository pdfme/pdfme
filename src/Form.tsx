import React from 'react';
import ReactDOM from 'react-dom';
import { PreviewUI } from './libs/class';
import { PreviewProps } from './libs/type';
import { DESTROYED_ERR_MSG } from './libs/constants';
import { I18nContext, FontContext } from './libs/contexts';
import Preview from './components/Preview';

class Form extends PreviewUI {
  private readonly onChangeInputCallback?: (arg: {
    index: number;
    value: string;
    key: string;
  }) => void;

  constructor(props: PreviewProps) {
    super(props);

    if (props.onChangeInput) {
      this.onChangeInputCallback = props.onChangeInput;
    }
  }

  private onChangeInput = (arg: { index: number; value: string; key: string }) => {
    const { index, value, key } = arg;
    if (this.onChangeInputCallback) {
      this.onChangeInputCallback({ index, value, key });
    }
    this.inputs[index][key] = value;
    this.render();
  };

  protected render() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    ReactDOM.render(
      <I18nContext.Provider value={this.getI18n()}>
        <FontContext.Provider value={this.getFont()}>
          <Preview
            template={this.template}
            size={this.size}
            inputs={this.inputs}
            onChangeInput={this.onChangeInput}
          />
        </FontContext.Provider>
      </I18nContext.Provider>,
      this.domContainer
    );
  }
}

export default Form;
