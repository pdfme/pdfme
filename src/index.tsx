import React from 'react';
import TemplateDesignerComponent from './TemplateDesigner';
// TODO components/Previewではなく、./Form, ./Viewerを使う
import PreviewComponents from './components/Preview';
import ReactDOM from 'react-dom';
import { TemplateDesignerProp, PageSize, Template } from './libs/type';
import { blankPdf } from './libs/constants';
import { I18nContext, curriedI18n } from './libs/i18n';

// このように変数にすると1ページ内で複数のeditor,previewインスタンスを作成できない
// let _previewDomContainer: HTMLElement | null = null;

const destroyedErrMsg = 'Template Designer is already destroyed';
class TemplateDesigner {
  private domContainer: HTMLElement | null;

  private template: Template;

  private saveTemplateCallback: (t: Template) => void;

  private size: PageSize;

  private lang: 'en' | 'ja' = 'en';

  constructor(props: TemplateDesignerProp & { lang?: 'en' | 'ja'; domContainer: HTMLElement }) {
    const { domContainer, template, saveTemplate, size, lang } = props;
    this.domContainer = domContainer;
    this.template = template;
    this.saveTemplateCallback = saveTemplate;
    this.size = size;
    this.lang = lang || 'en';
    this.render();
  }

  public destroy() {
    if (!this.domContainer) throw new Error(destroyedErrMsg);
    ReactDOM.unmountComponentAtNode(this.domContainer);
    this.domContainer = null;
  }

  public saveTemplate() {
    if (!this.domContainer) throw new Error(destroyedErrMsg);
    this.saveTemplateCallback(this.template);
  }

  public updateTemplate(template: Template) {
    if (!this.domContainer) throw new Error(destroyedErrMsg);
    this.template = template;
    this.render();
  }

  private render() {
    if (!this.domContainer) throw new Error(destroyedErrMsg);
    const i18n = curriedI18n(this.lang);
    ReactDOM.render(
      <I18nContext.Provider value={i18n}>
        <TemplateDesignerComponent
          template={this.template}
          saveTemplate={this.saveTemplateCallback}
          size={this.size}
          onChangeTemplate={(template) => {
            this.template = template;
          }}
        />
      </I18nContext.Provider>,
      this.domContainer
    );
  }
}

// const Preview = {
//   init: (
//     domContainer: HTMLElement,
//     template: Template,
//     inputs: { [key: string]: string }[],
//     size: PageSize
//   ) => {
//     _previewDomContainer = domContainer;
//     const i18n = curriedI18n(lang);

//     ReactDOM.render(
//       <I18nContext.Provider value={i18n}>
//         <PreviewComponents template={template} inputs={inputs} size={size} />
//       </I18nContext.Provider>,
//       domContainer
//     );
//   },
//   destroy: () => {
//     if (_previewDomContainer) {
//       ReactDOM.unmountComponentAtNode(_previewDomContainer);
//       _previewDomContainer = null;
//     }
//   },
// };

export default { TemplateDesigner, blankPdf };
export { TemplateDesigner, blankPdf };
