# Issue #1156: Multiple Pages with different sizes and orientations

- Status on current `main`: `still_missing`
- Suggested maintainer action: `keep`
- Evidence video: `/workspace/evidence/evidence-0664-1156-1185-pages-overflow.webm`
  - 00:06-00:10: page menu exposes page add/remove only, with no size/orientation selector.

## Rationale

For blank PDFs, the template has a single `basePdf` width/height shared by all pages. Designer's Add Page After operation inserts an empty schema page and keeps the same blank base PDF dimensions. The UI has no dialog or side-panel controls for choosing A4/A5/Letter or portrait/landscape per newly added page.

Custom PDF base files can have pages with different source dimensions, and the UI reads those page sizes for display, but that does not satisfy the requested blank-page creation/editing workflow.

Code evidence:

- `packages/common/src/schema.ts` defines `BlankPdf` as one `{ width, height, padding }` object.
- `packages/ui/src/hooks.ts` maps every blank-PDF schema page to the same `{ width, height }`.
- `packages/ui/src/components/Designer/index.tsx` `handleAddPageAfter` only splices an empty page into `schemasList`; it does not change or choose page geometry.
- `packages/ui/src/components/CtlBar.tsx` page menu items are Add Page After and Remove Current Page only.

## Notes

Keep open. This likely needs a template model change for per-page blank geometry, not just a UI dialog.
