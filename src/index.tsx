import TemplateDesignerComponent from './TemplateDesigner';
// TODO components/Previewではなく、./Form, ./Viewerを使う
import PreviewComponents from './components/Preview';
import TemplateDesignerHeader from './TemplateDesigner/Header';
import ReactDOM from 'react-dom';
import { PageSize, Template, TemplateDesignerHeaderProp } from './libs/type';
import { blankPdf, lang } from './libs/constants';
import { I18nContext, curriedI18n } from './libs/i18n';

// このように変数にすると1ページ内で複数のeditor,previewインスタンスを作成できない
let _editorDomContainer: HTMLElement | null = null;
let _previewDomContainer: HTMLElement | null = null;

const TemplateDesigner = {
  init: (
    domContainer: HTMLElement,
    template: Template,
    saveTemplate: (template: Template) => Promise<Template>,
    size: PageSize,
    // TODO Headerはカスタムできる仕様をやめる
    customHeader?: React.ComponentType<TemplateDesignerHeaderProp>
  ) => {
    _editorDomContainer = domContainer;
    const i18n = curriedI18n(lang);

    ReactDOM.render(
      <I18nContext.Provider value={i18n}>
        <TemplateDesignerComponent
          template={template}
          saveTemplate={saveTemplate}
          size={size}
          Header={customHeader || TemplateDesignerHeader}
        />
      </I18nContext.Provider>,
      domContainer
    );
  },
  destroy: () => {
    if (_editorDomContainer) {
      ReactDOM.unmountComponentAtNode(_editorDomContainer);
      _editorDomContainer = null;
    }
  },
};

const Preview = {
  init: (
    domContainer: HTMLElement,
    template: Template,
    inputs: { [key: string]: string }[],
    size: PageSize,
    onChange?: (arg: { index: number; value: string; key: string }) => void
  ) => {
    _previewDomContainer = domContainer;
    const i18n = curriedI18n(lang);

    ReactDOM.render(
      <I18nContext.Provider value={i18n}>
        <PreviewComponents
          template={template}
          inputs={inputs}
          size={size}
          onChange={onChange}
        />
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
