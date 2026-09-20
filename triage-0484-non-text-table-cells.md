# Issue #484: Enable rendering of non-text content in table cells

- Status on current `main`: `still_missing`
- Suggested maintainer action: `keep / needs design`
- Evidence video: `/workspace/evidence/evidence-1023-1222-1572-0484-table-designer.webm`
  - 00:00-00:07: selected table shows text-oriented table/head/body/column controls only.

## Rationale

Tables remain string-grid based. Cell rendering delegates to the internal `cell` text plugin with string `raw` values; there is no table cell type for barcode/image/custom schema binding, nested plugins, or per-cell schema rendering. The Designer exposes font/style controls at table head/body level and limited column alignment, but not a per-cell plugin/content model.

Code evidence:

- `packages/schemas/src/tables/types.ts` defines `head: string[]` and table body content as `string[][]`.
- `packages/schemas/src/tables/tableHelper.ts` creates `Cell(rawCell, styles, section)` from string rows.
- `packages/schemas/src/tables/pdfRender.ts` maps body rows to strings before creating a table and renders each table cell through `cell.pdf`.
- `packages/schemas/src/tables/propPanel.ts` exposes table styles, head styles, body styles, and column styles; no barcode/image/custom-schema cell binding exists.

## Notes

Keep open. This is broader than per-cell fonts; it needs a cell content API, measurement hooks, row-height behavior, pagination behavior, and Designer editing semantics.
