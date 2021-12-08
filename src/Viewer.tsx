import { PageSize, Template } from './libs/type';
import Preview from './components/Preview';

const Form = (props: {
  template: Template;
  inputs: { [key: string]: string }[];
  size: PageSize;
}) => <Preview {...props} />;

export default Form;
