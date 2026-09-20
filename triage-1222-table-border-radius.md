# Issue #1222: Add support for border radius on tables

- Status on current `main`: `still_missing`
- Suggested maintainer action: `keep`
- Evidence video: `/workspace/evidence/evidence-1023-1222-1572-0484-table-designer.webm`
  - 00:00-00:07: selected table properties show border width/color, but no border radius control.

## Rationale

Rounded corners exist for rectangle-like shape schemas, but not for tables. Table schema styles include border color and width only; table PDF rendering draws rectangular cells and an outer rectangular border.

Code evidence:

- `packages/schemas/src/tables/types.ts` `tableStyles` has `borderColor` and `borderWidth`, no `borderRadius`.
- `packages/schemas/src/tables/propPanel.ts` table style panel exposes only `borderWidth` and `borderColor`.
- `packages/schemas/src/tables/pdfRender.ts` draws the table border via the rectangle plugin without any table radius value.
- `packages/schemas/src/shapes/rectAndEllipse.ts` demonstrates radius support exists for rectangle schemas, but that property is not shared by table.

## Notes

Keep open. Native support should define outer-table vs per-cell radius behavior and how radius interacts with pagination and split tables.
