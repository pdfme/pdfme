import type { TextSchema } from '../text/types.js';

export type MultiVariableTextSchema = TextSchema & {
  text: string;
  variables: string[];
  /** When true, `content` is already-substituted display text (jsx locked MVT). */
  contentSnapshot?: boolean;
};
