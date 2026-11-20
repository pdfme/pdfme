import type { RichTextRun, TEXT_TRANSFORM } from './types.js';

export const DEFAULT_TEXT_TRANSFORM = 'none' as const satisfies TEXT_TRANSFORM;

export const transformTextCase = (value: string, transform?: TEXT_TRANSFORM): string => {
  if (transform === 'uppercase') return value.toUpperCase();
  if (transform === 'lowercase') return value.toLowerCase();
  return value;
};

export const transformTextCaseWithSourceOffsets = (value: string, transform?: TEXT_TRANSFORM) => {
  const text = transformTextCase(value, transform);
  const sourceOffsets = [0];
  const protectedBoundaries = new Set<number>();
  let sourceOffset = 0;
  let transformedOffset = 0;

  for (const character of value) {
    sourceOffset += character.length;
    const transformedLength = transformTextCase(character, transform).length;
    for (let index = 1; index < transformedLength; index += 1) {
      protectedBoundaries.add(transformedOffset + index);
    }
    for (let index = 0; index < transformedLength; index += 1) {
      sourceOffsets[transformedOffset + index + 1] = sourceOffset;
    }
    transformedOffset += transformedLength;
  }

  if (transformedOffset !== text.length) {
    throw new Error('[@pdfme/schemas] Text case transformation produced an invalid source map.');
  }

  return { text, sourceOffsets, protectedBoundaries };
};

export const transformRichTextRuns = (
  runs: RichTextRun[],
  transform?: TEXT_TRANSFORM,
): RichTextRun[] => {
  if (transform === undefined || transform === 'none') return runs;

  if (transform === 'uppercase') {
    return runs.map((run) => ({ ...run, text: run.text.toUpperCase() }));
  }

  const characters = Array.from(runs.map((run) => run.text).join(''));
  const isCased = (character: string) => /\p{Cased}/u.test(character);
  const isCaseIgnorable = (character: string) => /\p{Case_Ignorable}/u.test(character);
  const nextSignificantCharacterIsCased = Array.from({ length: characters.length }, () => false);
  let nextSignificantIsCased = false;

  for (let index = characters.length - 1; index >= 0; index -= 1) {
    const character = characters[index];
    if (character === undefined) continue;
    nextSignificantCharacterIsCased[index] = nextSignificantIsCased;
    if (!isCaseIgnorable(character)) {
      nextSignificantIsCased = isCased(character);
    }
  }

  const transformedRuns = runs.map((run) => ({ ...run, text: '' }));
  let runIndex = 0;
  let runEnd = runs[0]?.text.length ?? 0;
  let sourceOffset = 0;
  let precedingSignificantIsCased = false;

  characters.forEach((character, index) => {
    while (runIndex < runs.length - 1 && sourceOffset >= runEnd) {
      runIndex += 1;
      runEnd += runs[runIndex]?.text.length ?? 0;
    }

    const transformedCharacter =
      character === 'Σ'
        ? precedingSignificantIsCased && !nextSignificantCharacterIsCased[index]
          ? 'ς'
          : 'σ'
        : character.toLowerCase();
    const transformedRun = transformedRuns[runIndex];
    if (transformedRun) transformedRun.text += transformedCharacter;

    sourceOffset += character.length;
    if (!isCaseIgnorable(character)) {
      precedingSignificantIsCased = isCased(character);
    }
  });

  return transformedRuns;
};
