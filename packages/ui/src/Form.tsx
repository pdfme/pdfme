import React from 'react';
import ReactDOM from 'react-dom';
import { PreviewProps } from '@pdfme/common';
import { PreviewUI } from './class';
import { DESTROYED_ERR_MSG } from './constants.js';
import AppContextProvider from './components/AppContextProvider';
import Preview from './components/Preview';

class Form extends PreviewUI {
  private onChangeInputCallback?: (arg: { index: number; value: string; name: string }) => void;

  constructor(props: PreviewProps) {
    super(props);
  }

  public onChangeInput(cb: (arg: { index: number; value: string; name: string }) => void) {
    this.onChangeInputCallback = cb;
  }

  public setInputs(inputs: { [key: string]: string; }[]): void {
    super.setInputs(inputs);

    const transformedInputs =
      inputs.map((input, index) =>
        Object.keys(input).map((name) => ({ index, name, value: input[name] }))).flat();

    transformedInputs.forEach((input) => {
      if (this.onChangeInputCallback) {
        this.onChangeInputCallback(input);
      }
    });

  }

  protected render() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    ReactDOM.render(
      <AppContextProvider
        lang={this.getLang()}
        font={this.getFont()}
        plugins={this.getPluginsRegistry()}
        options={this.getOptions()}
      >
        <Preview
          template={this.template}
          size={this.size}
          inputs={this.inputs}
          onChangeInput={(arg: { index: number; value: string; name: string }) => {
            const { index, value, name } = arg;
            if (this.onChangeInputCallback) {
              this.onChangeInputCallback({ index, value, name });
            }
            if (this.inputs && this.inputs[index]) {
              if (this.inputs[index][name] !== value) {
                this.inputs[index][name] = value;
                this.render();
              }
            }
          }}
        />
      </AppContextProvider>,
      this.domContainer
    );
  }
}

export default Form;
