import React from 'react';
import { PreviewProp } from './libs/type';
import Preview from './components/Preview';

const Form = (props: PreviewProp) => <Preview {...props} />;

export default Form;
