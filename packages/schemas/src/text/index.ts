import type { Plugin } from '@pdfme/common';
import { pdfRender } from './pdfRender';
import { propPanel } from './propPanel';
import { uiRender } from './uiRender';
import type { TextSchema } from './types';

// FIXME ここに(Pluginに) defaultSchema を置くようにした方がいいかも
// propPanel.defaultSchemaはよくアクセスするが、propPanelにある理由が直感的ではない
// それでいうとdefaultValueも同じ
const schema: Plugin<TextSchema> = { pdf: pdfRender, ui: uiRender, propPanel };

export default schema;
