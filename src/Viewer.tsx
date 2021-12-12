import React from 'react';
import { PreviewProp } from './libs/type';
import Preview from './components/Preview';

const Viewer = (props: PreviewProp) => <Preview {...props} />;

export default Viewer;
