import type { TextSchema } from '../text/types';

export interface MultiVariableTextSchema extends TextSchema {
  text: string;
  variables: string[];
}
