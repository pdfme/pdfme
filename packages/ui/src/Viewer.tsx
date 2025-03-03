import React from 'react';
import ReactDOM from 'react-dom/client';
import { PreviewProps } from '@pdfme/common';
import { PreviewUI } from './class.js';
import { DESTROYED_ERR_MSG } from './constants.js';
import Preview from './components/Preview.js';
import AppContextProvider from './components/AppContextProvider.js';

class Viewer extends PreviewUI {
  constructor(props: PreviewProps) {
    super(props);
  }

  protected render() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    
    if (!this.root) {
      this.root = ReactDOM.createRoot(this.domContainer);
    }
    
    this.root.render(
      <AppContextProvider
        lang={this.getLang()}
        font={this.getFont()}
        plugins={this.getPluginsRegistry()}
        options={this.getOptions()}
      >
        <Preview template={this.template} size={this.size} inputs={this.inputs} />
      </AppContextProvider>
    );
  }
}

export default Viewer;
