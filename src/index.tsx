import EditorComponents from './components/Editor';
import PreviewComponents from './components/Preview';
import EditorHeader from './components/Editor/Header';
import ReactDOM from 'react-dom';
import { PageSize, Template, EditorHeaderProp } from './type';
import { blankPdf, lang } from './constants';
import { I18nContext, curriedI18n } from './i18n';

// このように変数にすると1ページ内で複数のeditor,previewインスタンスを作成できない
let _editorDomContainer: HTMLElement | null = null;
let _previewDomContainer: HTMLElement | null = null;

const Editor = {
  init: (
    domContainer: HTMLElement,
    fetchTemplate: () => Promise<Template>,
    saveTemplate: (template: Template) => Promise<Template>,
    customHeader?: React.ComponentType<EditorHeaderProp>
  ) => {
    _editorDomContainer = domContainer;
    const i18n = curriedI18n(lang);

    ReactDOM.render(
      <I18nContext.Provider value={i18n}>
        <EditorComponents
          fetchTemplate={fetchTemplate}
          saveTemplate={saveTemplate}
          Header={customHeader || EditorHeader}
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
    onChangeInput?: (arg: { index: number; value: string; key: string }) => void
  ) => {
    _previewDomContainer = domContainer;
    const i18n = curriedI18n(lang);

    ReactDOM.render(
      <I18nContext.Provider value={i18n}>
        <PreviewComponents
          template={template}
          inputs={inputs}
          size={size}
          onChangeInput={onChangeInput}
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

export default { Editor, Preview, blankPdf };
export { Editor, Preview, blankPdf };
