/**
 * Targeted script itemizer for mixed-script shaping.
 *
 * pdf-lib calls fontkit `layout()` once per string and emits only glyph IDs
 * (GPOS offsets are discarded). fontkit then picks a single script from the
 * first strong character, which skips Thai/Lao GSUB mark-variant substitutions
 * when Latin or CJK leads the string.
 *
 * Only mark-critical scripts are split out. Everything else stays one run so
 * existing Latin/CJK output stays bit-identical. Add a row (and a font-level
 * test) to extend the allowlist.
 */

type MarkCriticalScript = (typeof MARK_CRITICAL_SCRIPTS)[number]['name'];
type ScriptClass = MarkCriticalScript | 'default' | null;

const MARK_CRITICAL_SCRIPTS = [
  { name: 'thai' as const, test: /\p{Script=Thai}/u },
  { name: 'lao' as const, test: /\p{Script=Lao}/u },
] as const;

const MARK_CRITICAL_ANY = /[\p{Script=Thai}\p{Script=Lao}]/u;
const NEUTRAL = /[\p{Script=Common}\p{Script=Inherited}]/u;

const classifyCodePoint = (ch: string): ScriptClass => {
  if (NEUTRAL.test(ch)) return null;
  for (const { name, test } of MARK_CRITICAL_SCRIPTS) {
    if (test.test(ch)) return name;
  }
  return 'default';
};

/**
 * Split `text` into shaping runs at Thai/Lao script boundaries.
 * Concatenating the result always reproduces the input.
 */
export const splitTextIntoShapingRuns = (text: string): string[] => {
  if (text.length === 0) return [];
  if (!MARK_CRITICAL_ANY.test(text)) return [text];

  const runs: string[] = [];
  let current = '';
  let currentClass: ScriptClass = null;

  for (const ch of text) {
    const cls = classifyCodePoint(ch);
    const continues = cls === null || currentClass === null || currentClass === cls;
    if (!continues && current.length > 0) {
      runs.push(current);
      current = '';
      currentClass = null;
    }
    current += ch;
    if (cls !== null) currentClass = cls;
  }

  if (current.length > 0) runs.push(current);
  return runs;
};
