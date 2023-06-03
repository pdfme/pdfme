import { calculateCharacterSpacing } from '../src/helpers/calculateCharacterSpacing';

describe('calculateCharacterSpacing', () => {
  it('returns 0 when text content is an empty string', () => {
    expect(calculateCharacterSpacing('', 5)).toBe(0);
  });

  it('returns correct character spacing for when text content is a single character', () => {
    expect(calculateCharacterSpacing('A', 5)).toBe(10);
  });

  it('calculates the correct spacing for a given text content and character spacing', () => {
    expect(calculateCharacterSpacing('Hello, world!', 2)).toBe(24);
  });
});
