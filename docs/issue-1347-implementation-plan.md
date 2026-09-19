# Issue #1347 — Thai tone marks lost in Latin-leading mixed-script text: finalized implementation brief

Status: **GO** (reviewed and validated against `main` @ `231a8545`, 2026-09-19)
Scope: `packages/pdf-lib` only. No schemas, generator, or UI changes.
Issue: https://github.com/pdfme/pdfme/issues/1347

This brief is final. A coder can implement it without re-deciding architecture.
All claims below were validated empirically with fontkit 2.x and `@pdf-lib/fontkit` 1.x
against Sarabun-Regular and NotoSerifJP-Regular (experiment results inlined).

---

## 1. Root cause (validated)

`CustomFontEmbedder.encodeText` / `widthOfTextAtSize` and
`CustomFontSubsetEmbedder.encodeText` call `this.font.layout(text, this.fontFeatures)`
once for the whole string. fontkit picks **one script for the entire string** from the
first strong-script character (`Script.forString`). pdf-lib then uses **only glyph IDs
and `glyph.advanceWidth`** — the GPOS `positions` array (xOffset/yOffset/xAdvance) is
discarded, and text is emitted with `Tj`.

Measured with Sarabun-Regular for `ที่` (U+0E17 U+0E35 U+0E48):

| Input | Detected script | U+0E48 glyph | yOffset |
|---|---|---|---|
| `วันที่` (works today) | `thai` | gid 736 `uni0E48.small` — raised position **baked into the outline by GSUB** | 0 |
| `A วันที่` (bug) | `latn` | gid 735 `uni0E48` — raised only via GPOS mark-to-mark | 376 (dropped by pdf-lib) |

So Thai-only strings render correctly today *because* Sarabun's `thai`-script GSUB
substitutes pre-positioned variant glyphs; Latin/CJK-leading strings shape as
`latn`/`hani`, skip those GSUB rules, and the needed offset exists only in GPOS data
that pdf-lib throws away. SARA AM is affected too: `น้ำ` under `thai` produces the
`uni0E4D0E49` ligature (gids 462 762 488); under `latn` it stays 462 738 489 — a
different glyph sequence *and* width.

Key simplifying fact: **pdf-lib has never consumed GPOS**. Therefore the only
cross-script shaping differences that can affect PDF output are GSUB glyph-ID
differences. "No regression" is provable purely by glyph-ID equality.

## 2. Decision and revisions to the prior plan

**GO**, with two revisions:

### Revision A — targeted itemization, not generic all-script itemization

Generic per-script splitting demonstrably regresses existing output. Measured with
NotoSerifJP-Regular on `Invoice 請求書 2024年1月`:

- whole-string (`latn`, today): digits shape to gids 17347/17349/17351/17348, total advance 11889
- generically itemized (digits attach to the preceding `hani` run): digits shape to gids 17/19/21/18, total advance 11838

That changes digit glyphs and widths in Latin+CJK strings — pdfme's largest user base
(Japanese templates) — and would churn generator image snapshots for a case that is not
broken. Instead, **split only where a validated mark-critical script (Thai, Lao) meets
any other script**. Everything else stays a single run, bit-identical to today.
Validated consequences of the targeted rule (Sarabun / NotoSerifJP glyph IDs):

- `A วันที่`, `ABC วันที่`, `日 วันที่`, `A น้ำ` → Thai run shaped as `thai` → **fixed** (gid 736 / SARA AM ligature).
- `วันที่`, `1 วันที่`, `฿100 วันที่`, `👍 วันที่` → single run (leading Common joins the Thai run) → unchanged.
- `Hello world!`, `日本語のテスト`, `Invoice 請求書 2024年1月` → single run → unchanged.
- `วันที่ ABC`, `ที่ fine` → split, and glyph IDs verified **identical** to today's whole-string shaping (Latin `liga` resolves the same via DFLT), so even the Thai-then-Latin tail case is regression-free with Sarabun.

The allowlist is a data table; later PRs can add `khmr`, `mymr`, Indic, then RTL
scripts after per-script validation.

### Revision B — do not pass a script tag to `layout()`

Each run produced by the itemizer has a single strong script, so fontkit's per-run
auto-detection (first strong character) yields exactly the script we would pass
explicitly — verified identical output on both fontkit 2.x (runtime, injected by
`@pdfme/generator`) and `@pdf-lib/fontkit` 1.x (pdf-lib's own tests). Calling
`layout(run, this.fontFeatures)` unchanged means:

- no changes to `packages/pdf-lib/src/types/fontkit.ts` (its `layout(str, features)` signature stays valid),
- no coupling to fontkit's internal script-tag vocabulary (`thai`/`hira`/`hani`…),
- works with both fontkit major versions users may register.

Everything else in the prior plan is confirmed: pdf-lib-only scope; align
`widthOfTextAtSize` with the same helper; schemas untouched (schemas'
`splitTextToSize` measures via `Intl.Segmenter` word segments with per-segment
auto-detection, so Thai words are *already* measured thai-shaped — this fix moves PDF
output toward what schemas already measures); reject emitting GPOS/TJ now; reject
HarfBuzz; reject the schemas-level split (#1510).

## 3. Algorithm (final spec)

New helper `splitTextIntoShapingRuns(text: string): string[]`:

1. **Fast path:** if `text` does not match `/[\p{Script=Thai}\p{Script=Lao}]/u`,
   return `[text]` (one regex scan; zero overhead for all non-Thai/Lao users).
   Return `[]` for the empty string.
2. Otherwise iterate **by code point** (`for..of`; surrogate-safe). Classify each:
   - `Common` or `Inherited` (`/[\p{Script=Common}\p{Script=Inherited}]/u`) → class `null` (neutral; covers spaces, digits, punctuation, U+0E3F baht sign, emoji, ZWJ/ZWNJ, combining marks like U+0301),
   - `\p{Script=Thai}` → `'thai'`; `\p{Script=Lao}` → `'lao'`,
   - anything else → `'default'` (Latin, CJK, Cyrillic, Arabic, Devanagari, … — deliberately one class so their mixing keeps today's behavior; RTL handling is explicitly deferred).
3. Run construction: a neutral code point always continues the current run. A strong
   code point continues the run if the run has no class yet (it then sets the class —
   this makes leading neutrals join the first strong run, matching fontkit's
   whole-string detection for `1 วันที่`) or if its class equals the run's class;
   otherwise it starts a new run.
4. Concatenating the runs must always reproduce the input exactly.

Notes:
- ES2020 build target (`vite.config` / tsconfig) supports `\p{Script=…}` (ES2018); no dependency needed (do **not** add `unicode-properties`).
- Thai combining marks (U+0E31, U+0E34–0E4E) are `Script=Thai` (strong), so they can never be separated from their base.
- Use `Script=`, not `Script_Extensions=`, to mirror fontkit's own classification (`unicode-properties.getScript`).

Embedder integration — in `CustomFontEmbedder`, add one protected method and reuse it
everywhere glyphs are produced:

```ts
protected layoutRuns(text: string): Glyph[] {
  const runs = splitTextIntoShapingRuns(text);
  if (runs.length <= 1) return this.font.layout(runs[0] ?? '', this.fontFeatures).glyphs;
  const glyphs: Glyph[] = [];
  for (const run of runs) glyphs.push(...this.font.layout(run, this.fontFeatures).glyphs);
  return glyphs;
}
```

- `CustomFontEmbedder.encodeText`: replace the direct `this.font.layout(...)` with `this.layoutGlyphs(text)`; hex encoding loop unchanged.
- `CustomFontEmbedder.widthOfTextAtSize`: same replacement; advance summation unchanged (guarantees width == what `encodeText` draws, including the SARA AM ligature width change).
- `CustomFontSubsetEmbedder.encodeText`: same replacement; subset `includeGlyph` / `glyphIdMap` loop unchanged. ToUnicode is safe: variant glyphs carry `codePoints` (copy/paste already works today for Thai-first strings).
- `StandardFontEmbedder`: untouched (no Thai in standard fonts).
- Empty string: `runs = []` → zero glyphs → empty `PDFHexString`, identical to today.

## 4. Files to touch

| File | Change |
|---|---|
| `packages/pdf-lib/src/utils/scriptRuns.ts` (new) | classifier + `splitTextIntoShapingRuns` (~50–70 LOC) |
| `packages/pdf-lib/src/utils/index.ts` | re-export |
| `packages/pdf-lib/src/core/embedders/CustomFontEmbedder.ts` | add `layoutGlyphs`, use in `encodeText` + `widthOfTextAtSize` (~20 LOC) |
| `packages/pdf-lib/src/core/embedders/CustomFontSubsetEmbedder.ts` | use `layoutGlyphs` in `encodeText` (~5 LOC) |
| `packages/pdf-lib/assets/fonts/sarabun/Sarabun-Regular.ttf` (new, ~90 KB) | test fixture, OFL-licensed (Google Fonts); follows existing `assets/fonts/{ubuntu,source_hans_jp}` precedent |
| `packages/pdf-lib/__tests__/utils/scriptRuns.spec.ts` (new) | itemizer unit tests |
| `packages/pdf-lib/__tests__/core/embedders/CustomFontEmbedder.spec.ts` | Thai gid + width tests |
| `packages/pdf-lib/__tests__/core/embedders/CustomFontSubsetEmbedder.spec.ts` | subset Thai test |

Product code total: **~80–120 LOC** (down from the prior 150–220 estimate, because no
script tag is passed and no fontkit type changes are needed).

## 5. Test matrix

Itemizer unit tests (pure function, no font):

| Input | Expected runs |
|---|---|
| `''` | `[]` |
| `'Hello world!'` | `['Hello world!']` |
| `'วันที่'` | `['วันที่']` |
| `'A วันที่'` | `['A ', 'วันที่']` |
| `'1 วันที่'` | `['1 วันที่']` |
| `'วันที่ ABC'` | `['วันที่ ', 'ABC']` |
| `'A น้ำ'` | `['A ', 'น้ำ']` |
| `'日 วันที่'` | `['日 ', 'วันที่']` |
| `'日本語のテスト'` | `['日本語のテスト']` |
| `'Invoice 請求書 2024年1月'` | `['Invoice 請求書 2024年1月']` |
| `'วันe\u0301'` | `['วัน', 'e\u0301']` |
| `'฿100 วันที่'` | `['฿100 วันที่']` |
| `'👍 วันที่'` | `['👍 วันที่']` |
| `'   '` | `['   ']` |

Embedder tests (`@pdf-lib/fontkit` + Sarabun; validated glyph IDs, hex = gid as 4-digit hex):

- `CustomFontEmbedder.encodeText('วันที่')` → `01DE02DD01CE01CC02F202E0` (gids 478 733 462 460 754 736; unchanged vs today — regression guard for Thai-only).
- `CustomFontEmbedder.encodeText('A วันที่')` → `0004000301DE02DD01CE01CC02F202E0` — the fix: ends in `02E0` (736 `uni0E48.small`), not `02DF` (735 `uni0E48`).
- `CustomFontEmbedder.encodeText('A น้ำ')` → contains gids 462, 762 (`uni0E4D0E49` ligature), 488 — SARA AM fixed in mixed text.
- `widthOfTextAtSize('A วันที่', s)` = `widthOfTextAtSize('A ', s) + widthOfTextAtSize('วันที่', s)` (compute exact expected values from advances at implementation time).
- Existing Ubuntu-font tests (`'Stuff and thingz!'` hex + widths) must pass unchanged — Latin regression guard.
- `CustomFontSubsetEmbedder.encodeText('A วันที่')` → 8 subset glyph IDs; the included glyph set contains font gid 736 and its `codePoints` include 0x0E48 (ToUnicode/copy-paste preserved).
- One end-to-end: `PDFDocument` + `embedFont(sarabun, { subset: true })` + `drawText('A วันที่')` → `save()` succeeds (wiring through `PDFPage.drawText` per line).

Whole-repo: `npm run test` and `npm run lint` must pass. Expected snapshot churn:
**none** (no existing test contains Thai; all non-Thai strings are single-run and
bit-identical — verified for kanji/kana/digit/Latin mixes).

Manual verification: rebuild `pdf-lib` → `common` → `generator`, run the issue's repro
(Sarabun, inputs `วันที่` and `A วันที่`), confirm both PDFs show the tone mark; also
check the playground Designer/Form preview once packages are linked.

## 6. Risks and mitigations

- **Thai/Lao-mixed strings change output by design** (`วันที่ ABC` splits). Verified glyph-identical for Sarabun; other Thai fonts could theoretically differ in Latin-under-`thai` vs Latin-under-`latn` GSUB, but any diff is a correction. Covered by gid tests.
- **Lao is included without a font-level test** (structurally identical to Thai in fontkit's shaper selection; currently broken the same way in mixed text). If maintainers want strictly-validated behavior only, drop `\p{Script=Lao}` from both regexes — one-line change; add it back with a Lao font test later.
- **fontkit version skew**: v1 and v2 were both tested and behave identically for detection and Thai GSUB; the design intentionally avoids the explicit-script parameter, whose signature is the only place they could differ.
- **Perf**: one extra regex scan per encoded line for everyone; per-code-point walk and 2 `layout()` calls only for Thai/Lao-containing lines. Negligible.
- **Mark still ~0.01 em off horizontally**: fontkit emits small GPOS xOffsets (−10/−11 units) even in the `thai` case; these are dropped today for Thai-only strings too, so this PR keeps parity. Full GPOS emission (`TJ`/`Td`) remains a separate, later work item.

## 7. Explicitly out of scope (later PRs)

1. Emitting GPOS offsets (TJ operator / per-glyph positioning) — prerequisite for Arabic/Indic correctness.
2. RTL scripts (Arabic, Hebrew): itemizer deliberately classes them `'default'` so mixed Latin+RTL output is unchanged; needs bidi + glyph-order design first.
3. Extending the allowlist (Khmer, Myanmar, Indic) — data change + per-script validation.
4. Schemas-side width metrics changes — not needed; schemas already measure Thai segments thai-shaped.

## 8. Implementation checklist

1. Branch `fix/pdf-lib-thai-script-runs` (or cursor-prefixed equivalent).
2. Add `scriptRuns.ts` + export; implement per §3.
3. Wire `layoutGlyphs` into the three call sites per §3.
4. Add Sarabun fixture + tests per §5.
5. `npm run build -w packages/pdf-lib && npm run test -w packages/pdf-lib`, then full `npm run test`, `npm run lint`, `npm run fmt`.
6. Manual repro check per §5.
7. Conventional commit: `fix(pdf-lib): shape Thai/Lao script runs separately so GSUB mark variants survive mixed-script text`.
