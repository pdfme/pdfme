# Issue #495 - Viewer with large PDF size >20 MB

- **Status on current main:** `needs_more_info`
- **Suggested maintainer action:** need-author-info

## Rationale

The current Viewer preprocessing path still eagerly processes the whole base PDF: `packages/ui/src/hooks.ts` calls `pdf2size(...)` and `pdf2img(...)` for the complete PDF before the UI can use the resulting backgrounds. This supports the performance concern, but the issue does not provide a representative PDF, page count, render timing, or memory profile.

Runtime evidence with a synthetic 80-page PDF confirmed the eager all-page behavior (`pdf2img` returned 80 images). It did not reproduce a hang in this environment, and the synthetic file was much smaller than the reported >20 MB workload, so a real author sample is still needed to classify the original report as reproducible on current main.

## Evidence

- Video: `artifacts/batch-a/evidence-495-large-pdf-viewer.mp4`
- Synthetic PDF: `artifacts/batch-a/issue-495-synthetic-large.pdf`
- Runtime log: `artifacts/batch-a/repro-output.txt`

Key runtime output:

```text
synthetic PDF bytes=217525, pages=80
pdf2size all pages: 227.1ms
pdf2img rendered images eagerly: count=80, 1628.7ms
source: packages/ui/src/hooks.ts useUIPreProcessor awaits pdf2size and pdf2img for the whole base PDF before rendering
```
