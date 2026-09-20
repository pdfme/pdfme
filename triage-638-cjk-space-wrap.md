# Issue #638 - generate() takes a blank space as a line break when CJK

- **Status on current main:** `fixed_already`
- **Suggested maintainer action:** close-as-fixed

## Rationale

Current main's text wrapping implementation has been replaced with a shared wrap engine using UAX #14 and `Intl.Segmenter` (`packages/schemas/src/text/wrap.ts`). There is also an existing generator integration fixture for Japanese segmenter output (`packages/generator/__tests__/integration-segmenter.test.ts` and `packages/generator/__tests__/assets/templates/segmenterJapanese.json`).

Runtime generation using the Japanese string from the issue and `NotoSansJP` completed successfully and produced output PDF/PNG artifacts. I did not observe the older blank-space-only wrapping implementation in current source.

## Evidence

- Video: `artifacts/batch-a/evidence-638-cjk-space-wrap.mp4`
- Output PDF: `artifacts/batch-a/issue-638-cjk-wrap.pdf`
- Output PNG: `artifacts/batch-a/issue-638-cjk-wrap.png`
- Runtime log: `artifacts/batch-a/repro-output.txt`

Key runtime output:

```text
contains Intl.Segmenter: true
saved issue-638-cjk-wrap.pdf and .png
```
