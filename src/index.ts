import generate from './generate';
import TemplateDesigner from './TemplateDesigner';
import Form from './Form';
import Viewer from './Viewer';
import { blankPdf } from './libs/constants';

// TODO templateを渡すときに columns, sampledataがない場合は作成する必要がある
// 下記を参考に作成する
// https://github.com/hand-dot/labelmake-ui/blob/f8f20b136d30ffbd66cb116fde39b8c8326ed22a/src/libs/utils.ts#L285
export default { generate, TemplateDesigner, Viewer, Form, blankPdf };
export { generate, TemplateDesigner, Viewer, Form, blankPdf };
