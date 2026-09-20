# Issue #664: Able to set table height for main and overflow page

- Status on current `main`: `still_missing`
- Suggested maintainer action: `keep`
- Evidence video: `/workspace/evidence/evidence-0664-1156-1185-pages-overflow.webm`
  - 00:03-00:06: selected table has no main-page height / overflow-page height controls.

## Rationale

Current dynamic table splitting uses the blank base PDF content height (`height - paddingTop - paddingBottom`) and the table's current page position. There is no schema property or Designer control for different first-page and continuation-page table heights.

Code evidence:

- `packages/common/src/dynamicTemplate.ts` computes page content height from blank base PDF padding and places dynamic units across pages.
- `packages/schemas/src/tables/dynamicTemplate.ts` calculates row/header heights and repeat-header behavior, but does not read a main-page/overflow-page height setting.
- `packages/schemas/src/tables/propPanel.ts` exposes table border/head/body/column styling, not overflow page height.

## Notes

Keep open. The design should decide whether this belongs on the table schema, dynamic layout options, page regions, or a more general layout-flow model.
