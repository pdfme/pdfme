import Editor from './components/Editor';
import './index.scss';
import defaultEditorCtl from './components/EditorCtl';
import ReactDOM from 'react-dom';
import { Template, TemplateEditorCtlProp } from './types';
import { blankPdf } from './constants';

const init = (
  domContainer: HTMLElement,
  fetchTemplate: () => Promise<Template>,
  saveTemplate: (template: Template) => Promise<Template>,
  customEditorCtl?: React.ComponentType<TemplateEditorCtlProp>
) => {
  ReactDOM.render(
    <Editor
      lang="en"
      fetchTemplate={fetchTemplate}
      saveTemplate={saveTemplate}
      EditorCtl={customEditorCtl || defaultEditorCtl}
    />,
    domContainer
  );
};

export default { init, blankPdf };
export { init, blankPdf };
