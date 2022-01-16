import React from 'react';
import ReactDOM from 'react-dom';
import { PreviewUI } from './libs/class';
import { Template, UIOptions } from './libs/type';
import { DESTROYED_ERR_MSG } from './libs/constants';
import { I18nContext, FontContext } from './libs/contexts';
import Preview from './components/Preview';

class Form extends PreviewUI {
  private readonly onChangeInputCallback?: (arg: {
    index: number;
    value: string;
    key: string;
  }) => void;

  constructor(props: {
    domContainer: HTMLElement;
    template: Template;
    inputs: { [key: string]: string }[];
    onChangeInput?: (arg: { index: number; value: string; key: string }) => void;
    options?: UIOptions;
  }) {
    super(props);

    if (props.onChangeInput) {
      this.onChangeInputCallback = props.onChangeInput;
    }
  }

  protected render() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
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
