import { text } from '@pdfme/schemas';
import type { UIRenderer, UIRender } from './types';

const renderer: UIRenderer = { text: text.ui as UIRender };
export default renderer;
