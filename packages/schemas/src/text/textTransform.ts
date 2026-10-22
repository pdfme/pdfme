import type { RichTextRun, TEXT_TRANSFORM } from './types.js';

export const DEFAULT_TEXT_TRANSFORM = 'none' as const satisfies TEXT_TRANSFORM;

export const transformTextCase = (value: string, transform?: TEXT_TRANSFORM): string => {
  if (transform === 'uppercase') return value.toUpperCase();
  if (transform === 'lowercase') return value.toLowerCase();
  return value;
};

export const transformRichTextRuns = (
  runs: RichTextRun[],
  transform?: TEXT_TRANSFORM,
): RichTextRun[] => runs.map((run) => ({ ...run, text: transformTextCase(run.text, transform) }));
