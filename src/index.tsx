import React from 'react';
import TemplateDesignerComponent from './TemplateDesigner';
// TODO components/Previewではなく、./Form, ./Viewerを使う
import PreviewComponents from './components/Preview';
import ReactDOM from 'react-dom';
import { PageSize, Template } from './libs/type';
import { blankPdf, lang } from './libs/constants';
import { I18nContext, curriedI18n } from './libs/i18n';

// このように変数にすると1ページ内で複数のeditor,previewインスタンスを作成できない
// let _editorDomContainer: HTMLElement | null = null;
let _previewDomContainer: HTMLElement | null = null;

// const TemplateDesigner = {
//   init: (
//     domContainer: HTMLElement,
//     template: Template,
//     saveTemplate: (t: Template) => void,
//     size: PageSize
//   ) => {
//     _editorDomContainer = domContainer;
//     const i18n = curriedI18n(lang);

//     ReactDOM.render(
//       <I18nContext.Provider value={i18n}>
//         <TemplateDesignerComponent template={template} saveTemplate={saveTemplate} size={size} />
//       </I18nContext.Provider>,
//       domContainer
//     );
//   },
//   destroy: () => {
//     if (_editorDomContainer) {
//       ReactDOM.unmountComponentAtNode(_editorDomContainer);
//       _editorDomContainer = null;
//     }
//   },
// };

class TemplateDesigner {
  private domContainer: HTMLElement;

  private template: Template;

  private saveTemplate: (t: Template) => void;

  private size: PageSize;

  constructor({
    domContainer,
    template,
    saveTemplate,
    size,
  }: {
    domContainer: HTMLElement;
    template: Template;
    saveTemplate: (t: Template) => void;
    size: PageSize;
  }) {
    this.domContainer = domContainer;
    this.template = template;
    this.saveTemplate = saveTemplate;
    this.size = size;
    this.render();
  }

  public destroy() {
    if (!this.domContainer) return;
    ReactDOM.unmountComponentAtNode(this.domContainer);
  }

  private render() {
    if (!this.domContainer) return;
    const i18n = curriedI18n(lang);

    ReactDOM.render(
      <I18nContext.Provider value={i18n}>
        <TemplateDesignerComponent
          template={this.template}
          saveTemplate={this.saveTemplate}
          size={this.size}
        />
      </I18nContext.Provider>,
      this.domContainer
    );
  }
}

const Preview = {
  init: (
    domContainer: HTMLElement,
    template: Template,
    inputs: { [key: string]: string }[],
    size: PageSize
  ) => {
    _previewDomContainer = domContainer;
    const i18n = curriedI18n(lang);

    ReactDOM.render(
      <I18nContext.Provider value={i18n}>
        <PreviewComponents template={template} inputs={inputs} size={size} />
      </I18nContext.Provider>,
      domContainer
    );
  },
  destroy: () => {
    if (_previewDomContainer) {
      ReactDOM.unmountComponentAtNode(_previewDomContainer);
      _previewDomContainer = null;
    }
  },
};

export default { TemplateDesigner, Preview, blankPdf };
export { TemplateDesigner, Preview, blankPdf };
