import React from 'react';
import ReactDOM from 'react-dom';
import { PreviewProps } from '@pdfme/common';
import { PreviewUI } from './class.js';
import { DESTROYED_ERR_MSG } from './constants.js';
import AppContextProvider from './components/AppContextProvider.js';
import Preview from './components/Preview.js';

class Form extends PreviewUI {
  private onChangeInputCallback?: (arg: { index: number; value: string; name: string }) => void;

  constructor(props: PreviewProps) {
    super(props);
  }

  public onChangeInput(cb: (arg: { index: number; value: string; name: string }) => void) {
    this.onChangeInputCallback = cb;
  }

  public setInputs(inputs: { [key: string]: string }[]): void {
    const previousInputs = this.getInputs();

    super.setInputs(inputs);

    const changedInputs: Array<{ index: number; name: string; value: string }> = [];

    inputs.forEach((input, index) => {
      const prevInput = previousInputs[index] || {};

      const allKeys = new Set([...Object.keys(input), ...Object.keys(prevInput)]);

      allKeys.forEach((name) => {
        const newValue = input[name];
        const oldValue = prevInput[name];

        if (newValue !== oldValue) {
          changedInputs.push({ index, name, value: newValue });
        }
      });
    });

    changedInputs.forEach((input) => {
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
      this.domContainer,
    );
  }
}

export default Form;
