import Editor from './components/Editor';
import defaultEditorCtl from './components/EditorCtl';
import ReactDOM from 'react-dom';
import { Template, TemplateEditorCtlProp } from './type';
import { blankPdf, lang } from './constants';

let _domContainer: HTMLElement | null = null;

const init = (
  domContainer: HTMLElement,
  fetchTemplate: () => Promise<Template>,
  saveTemplate: (template: Template) => Promise<Template>,
  customEditorCtl?: React.ComponentType<TemplateEditorCtlProp>
) => {
  _domContainer = domContainer;
  ReactDOM.render(
    <Editor
      lang={lang}
      fetchTemplate={fetchTemplate}
      saveTemplate={saveTemplate}
      EditorCtl={customEditorCtl || defaultEditorCtl}
    />,
    domContainer
  );
};

const destroy = () => {
  if (_domContainer) {
    ReactDOM.unmountComponentAtNode(_domContainer);
    _domContainer = null;
  }
};

export default { destroy, init, blankPdf };
export { destroy, init, blankPdf };
