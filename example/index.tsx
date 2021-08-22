import 'react-app-polyfill/ie11';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Editor } from '../.';

const App = () => {
  return (
    <div>
      <Editor />
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
