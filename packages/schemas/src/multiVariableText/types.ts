import type { TextSchema } from '../text/types';

export interface MultiVariableTextSchema extends TextSchema {
  content: string;
  variables: string[];
}
