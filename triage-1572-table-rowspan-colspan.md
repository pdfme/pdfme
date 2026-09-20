# Issue #1572: Support rowSpan / colSpan for merged cells in the Table schema

- Status on current `main`: `still_missing`
- Suggested maintainer action: `keep / needs design`
- Evidence video: `/workspace/evidence/evidence-1023-1222-1572-0484-table-designer.webm`
  - 00:00-00:07: table Designer exposes strict text-grid controls only; no merge/split cells or span fields.

## Rationale

The public table input remains a strict string grid. There is internal span-looking scaffolding, but it is not wired to schema/input data: `columnSpansLeft` is reset to `0`, row span tracking is never populated from user cell data, and the cell type has no `rowSpan`/`colSpan` properties.

Code evidence:

- `packages/schemas/src/tables/types.ts` defines `head: string[]` and body content as `string[][]`.
- `packages/schemas/src/tables/tableHelper.ts` `parseSection` constructs cells from row strings and never reads span metadata.
- `packages/schemas/src/tables/classes.ts` contains `applyColSpans` / `applyRowSpans`, but current cells do not carry span counts that activate merged-cell behavior.
- `packages/schemas/src/tables/uiRender.ts` add/remove column/row controls assume every row is the same column grid.

## Notes

Keep open. This needs API design for cell input shape, validation, Designer merge/split operations, pagination behavior, and backwards compatibility with existing string arrays.
