import type { TextSchema } from '../text/types.js';

export type MultiVariableTextSchema = TextSchema & {
  text: string;
  variables: string[];
};
