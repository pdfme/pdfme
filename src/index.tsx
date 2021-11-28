import EditorComponents from './components/Editor';
import PreviewComponents from './components/Preview';
import EditorHeader from './components/Editor/Header';
import ReactDOM from 'react-dom';
import { PageSize, Template, EditorHeaderProp } from './type';
import { blankPdf, lang } from './constants';

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
    ReactDOM.render(
      <EditorComponents
        lang={lang}
        fetchTemplate={fetchTemplate}
        saveTemplate={saveTemplate}
        Header={customHeader || EditorHeader}
      />,
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
    changeInput?: (arg: { index: number; value: string; key: string }) => void
  ) => {
    _previewDomContainer = domContainer;
    ReactDOM.render(
      <PreviewComponents
        template={template}
        inputs={inputs}
        size={size}
        changeInput={changeInput}
      />,
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
