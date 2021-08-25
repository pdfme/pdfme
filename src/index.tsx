import Editor from './components/Editor';
import * as styles from './index.module.css';
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
    <div className={styles.labelmakeEditor}>
      <Editor
        lang="en"
        fetchTemplate={fetchTemplate}
        saveTemplate={saveTemplate}
        EditorCtl={customEditorCtl || defaultEditorCtl}
      />
    </div>,
    domContainer
  );
};

export default { init, blankPdf };
export { init, blankPdf };
