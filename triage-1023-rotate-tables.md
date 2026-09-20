# Issue #1023: The ability to rotate tables in the WYSIWYG editor

- Status on current `main`: `still_missing`
- Suggested maintainer action: `keep / needs design`
- Evidence video: `/workspace/evidence/evidence-1023-1222-1572-0484-table-designer.webm`
  - 00:00-00:04: table selected in Designer.
  - 00:04-00:07: no rotation handle/control is available for the selected table.

## Rationale

The Designer enables rotation only for schema types whose plugin default schema contains a `rotate` property. The table plugin default schema does not include `rotate`, so tables are not rotatable in the WYSIWYG Designer. Although the generic UI wrapper can apply CSS rotation if a schema already has `rotate`, table creation/editing does not expose it, and table PDF rendering remains axis-aligned row/cell drawing.

Code evidence:

- `packages/schemas/src/tables/propPanel.ts` table `defaultSchema` has no `rotate`.
- `packages/ui/src/components/Designer/Canvas/index.tsx` sets `rotatable` only when all selected schema types' default schemas include `rotate`.
- `packages/schemas/src/tables/pdfRender.ts` draws rows/cells by absolute x/y cursor advancement and does not apply table-level rotation.

## Notes

Keep open. Rotated tables need layout design for hit testing, row/column resizing, dynamic height, page breaks, and PDF rendering.
