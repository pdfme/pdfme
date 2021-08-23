import Editor from './components/Editor';
import './index.scss';
import EditorCtl from './components/EditorCtl';
import ReactDOM from 'react-dom';
import { Template } from './types';
import { blankPdf } from './constants';
const devTemplate = {
  columns: ['field1', 'field2'],
  sampledata: [
    {
      field1: 'aa',
      field2: 'aaaaaaaaaaaa',
    },
  ],
  fontName: '',
  basePdf: blankPdf,
  schemas: [
    {
      field1: {
        type: 'text',
        position: { x: 20, y: 20 },
        width: 100,
        height: 15,
        alignment: 'left',
        fontSize: 30,
        characterSpacing: 0,
        lineHeight: 1,
      },
      field2: {
        type: 'text',
        position: { x: 20, y: 35 },
        width: 100,
        height: 40,
        alignment: 'left',
        fontSize: 20,
        characterSpacing: 0,
        lineHeight: 1,
      },
    },
  ],
};
const getForDevTemplate = () => devTemplate;

const init = (domContainer: HTMLElement, initTemplate: () => Promise<Template>) => {
  ReactDOM.render(
    <Editor
      lang="en"
      initTemplate={initTemplate}
      saveTemplate={(saveTemplateArg) => {
        console.log(saveTemplateArg);
        return Promise.resolve();
      }}
      EditorCtl={EditorCtl}
    />,
    domContainer
  );
};

export default { init, getForDevTemplate };
export { init, getForDevTemplate };
