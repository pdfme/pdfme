# Issue #1433 - SVG plugin does not pass fonts to page.drawSvg()

- **Status on current main:** `reproduces`
- **Suggested maintainer action:** keep

## Rationale

Current main's SVG schema plugin still calls `page.drawSvg(value, { x, y, width, height })` without forwarding fonts from `arg.options.font` (`packages/schemas/src/graphics/svg.ts`). A runtime generation attempt with an SVG `<text>` element containing Japanese text and `NotoSansJP` supplied via `generate(..., options: { font })` still throws a WinAnsi encoding error.

This confirms the configured font is not reaching the SVG text renderer.

## Evidence

- Video: `artifacts/batch-a/evidence-1433-svg-japanese-fonts.mp4`
- Runtime log: `artifacts/batch-a/repro-output.txt`

Key runtime output:

```text
generate() threw: WinAnsi cannot encode "日" (0x65e5)
```
