// CJK Unicode ranges
const CJK_RANGES = [
  [0x4e00, 0x9fff], // CJK Unified Ideographs
  [0x3400, 0x4dbf], // CJK Unified Ideographs Extension A
  [0x3040, 0x309f], // Hiragana
  [0x30a0, 0x30ff], // Katakana
  [0xac00, 0xd7af], // Hangul Syllables
  [0x3000, 0x303f], // CJK Symbols and Punctuation
  [0xff00, 0xffef], // Halfwidth and Fullwidth Forms
] as const;

export function containsCJK(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    for (const [start, end] of CJK_RANGES) {
      if (code >= start && code <= end) return true;
    }
  }
  return false;
}

export function detectCJKInTemplate(template: { schemas?: unknown }): boolean {
  if (!Array.isArray(template.schemas)) {
    return false;
  }

  for (const page of template.schemas) {
    if (!Array.isArray(page)) {
      continue;
    }

    for (const schema of page) {
      if (typeof schema !== 'object' || schema === null) {
        continue;
      }

      if (typeof schema.content === 'string' && containsCJK(schema.content)) {
        return true;
      }
    }
  }
  return false;
}

export function detectCJKInInputs(inputs: unknown): boolean {
  if (!Array.isArray(inputs)) {
    return false;
  }

  for (const input of inputs) {
    if (typeof input !== 'object' || input === null) {
      continue;
    }

    for (const value of Object.values(input)) {
      if (typeof value === 'string' && containsCJK(value)) {
        return true;
      }
    }
  }
  return false;
}
