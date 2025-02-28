import type { TextSchema } from '../text/types.js';

export interface MultiVariableTextSchema extends TextSchema {
  text: string;
  variables: string[];
}
