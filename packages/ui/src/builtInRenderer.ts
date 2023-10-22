import type { UIRenderer, UIRender } from '@pdfme/common';
import { text } from '@pdfme/schemas';

const renderer: UIRenderer = { text: text.ui as UIRender };
export default renderer;
