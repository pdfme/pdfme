# Issue #623 - Renderer does not consider when PDF CropBox != MediaBox

- **Status on current main:** `fixed_already`
- **Suggested maintainer action:** close-as-fixed

## Rationale

Current main now uses the source page CropBox when embedding custom base PDFs (`packages/generator/src/helper.ts` maps `embedPdfPages.map((p) => p.getCropBox())` through the embed path). A synthetic base PDF with MediaBox `300x200 pt` and CropBox `(50, 40, 200, 120)` generated an output page sized to the visible CropBox (`200x120 pt`) with the output CropBox reset to origin.

This matches the expected current behavior for the synthetic case. If the original editor-generated PDF still fails, maintainers would need that specific base PDF/template as a counterexample.

## Evidence

- Video: `artifacts/batch-a/evidence-623-cropbox-mediabox.mp4`
- Base PDF: `artifacts/batch-a/issue-623-base-cropbox.pdf`
- Output PDF: `artifacts/batch-a/issue-623-cropbox-output.pdf`
- Output PNG: `artifacts/batch-a/issue-623-cropbox-output.png`
- Runtime log: `artifacts/batch-a/repro-output.txt`

Key runtime output:

```text
output page size: {"width":200,"height":120}
output cropBox: {"x":0,"y":0,"width":200,"height":120}
```
