import React from 'react';
import * as ReactDOM from 'react-dom';
import { Default as Editor } from '../stories/Editor.stories';

describe('Editor', () => {
  it('renders without crashing', () => {
    const div = document.createElement('div');
    ReactDOM.render(<Editor />, div);
    ReactDOM.unmountComponentAtNode(div);
  });
});
