# Issue #707 - Uppercasing text

Status: `still_missing`

## Rationale

- `TextSchema` contains font, alignment, markdown, underline/strikethrough, spacing, dynamic font size, overflow, and color properties, but no case-transform/text-transform field.
- Searches found no text rendering `toUpperCase()`/`toLowerCase()` path for the text schema and no toolbar/prop-panel control for upper/lower case.
- Current workaround remains transforming input data before generation.

## Suggested action

Keep open. If implemented, define a small enum such as `textTransform: 'none' | 'uppercase' | 'lowercase'` and apply it consistently in UI, dynamic measurement, PDF rendering, and AcroForm generation if relevant.

## Evidence

- `evidence-0707-text-case-transform.mp4`
