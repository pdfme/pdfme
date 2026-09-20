# Issue #1185: Overlapping Tables & No Auto Page Break in Designer

- Status on current `main`: `partially_done`
- Suggested maintainer action: `keep`
- Evidence video: `/workspace/evidence/evidence-0664-1156-1185-pages-overflow.webm`
  - 00:00-00:03: Designer shows a growing table overlapping a following field.

## Rationale

Generated PDFs for blank base PDFs now have dynamic-layout support: table rows can split over pages, repeat headers, and downstream schemas can be shifted after dynamic height changes. However, the Designer remains absolute-positioned. When a table grows in the Designer, its own height updates, but following fields are not automatically shifted and no collision warning is shown.

Code evidence:

- `packages/schemas/src/tables/uiRender.ts` updates only the selected table schema height when the calculated table height changes.
- `packages/common/src/dynamicTemplate.ts` contains the generated-PDF dynamic placement logic that offsets downstream items and splits dynamic units onto new pages.
- `packages/generator/src/generate.ts` applies `getDynamicTemplate` for blank base PDFs with dynamic schemas before rendering.
- `packages/generator/__tests__/table-row-height-overflow.test.ts` covers generated-PDF behavior where a following field stays below a multi-page table.

## Notes

Keep open, but retitle/scope to Designer layout/collision UX if maintainers consider generated-PDF auto page-break fixed for blank base PDFs.
