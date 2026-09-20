# Batch C triage summary: Designer / table / a11y-ish features

Investigation only. No fixes implemented, no GitHub issue actions taken, and no PR opened.

## Summary table

| Issue | Title | Status on current `main` | Suggested maintainer action | Report | Evidence |
|---:|---|---|---|---|---|
| #26 | Add Schema grouping function | `partially_done` | keep / needs design | `triage-0026-schema-grouping.md` | `/workspace/evidence/evidence-0026-0028-1310-designer-controls.webm` |
| #28 | Add context menu in Designer | `still_missing` | keep | `triage-0028-context-menu.md` | `/workspace/evidence/evidence-0026-0028-1310-designer-controls.webm` |
| #484 | Enable rendering of non-text content in table cells | `still_missing` | keep / needs design | `triage-0484-non-text-table-cells.md` | `/workspace/evidence/evidence-1023-1222-1572-0484-table-designer.webm` |
| #664 | Able to set table height for main and overflow page | `still_missing` | keep | `triage-0664-table-overflow-height.md` | `/workspace/evidence/evidence-0664-1156-1185-pages-overflow.webm` |
| #1023 | Rotate tables in the WYSIWYG editor | `still_missing` | keep / needs design | `triage-1023-rotate-tables.md` | `/workspace/evidence/evidence-1023-1222-1572-0484-table-designer.webm` |
| #1121 | Accessibility, Tags/Structure & Metadata | `partially_done` | keep / needs design | `triage-1121-accessibility-tags-metadata.md` | `/workspace/evidence/evidence-1121-1187-generated-pdf.webm` |
| #1156 | Multiple pages with different sizes and orientations | `still_missing` | keep | `triage-1156-mixed-page-sizes-orientations.md` | `/workspace/evidence/evidence-0664-1156-1185-pages-overflow.webm` |
| #1185 | Overlapping Tables & No Auto Page Break in Designer | `partially_done` | keep | `triage-1185-designer-table-overlap-page-break.md` | `/workspace/evidence/evidence-0664-1156-1185-pages-overflow.webm` |
| #1187 | AcroForm Support | `partially_done` | keep | `triage-1187-acroform-support.md` | `/workspace/evidence/evidence-1121-1187-generated-pdf.webm` |
| #1222 | Add support for border radius on tables | `still_missing` | keep | `triage-1222-table-border-radius.md` | `/workspace/evidence/evidence-1023-1222-1572-0484-table-designer.webm` |
| #1310 | Constant properties like SIDEBAR_WIDTH can be edited | `still_missing` | keep / needs design | `triage-1310-sidebar-width-constants.md` | `/workspace/evidence/evidence-0026-0028-1310-designer-controls.webm` |
| #1572 | Support rowSpan / colSpan for merged cells in Table schema | `still_missing` | keep / needs design | `triage-1572-table-rowspan-colspan.md` | `/workspace/evidence/evidence-1023-1222-1572-0484-table-designer.webm` |

## Evidence videos

- `/workspace/evidence/evidence-0026-0028-1310-designer-controls.webm`
  - Covers Designer grouping, schema context menu absence, and fixed sidebar dimensions.
- `/workspace/evidence/evidence-1023-1222-1572-0484-table-designer.webm`
  - Covers table rotate absence, border radius absence, rowSpan/colSpan absence, and non-text table cell absence.
- `/workspace/evidence/evidence-0664-1156-1185-pages-overflow.webm`
  - Covers table overflow-height control absence, page size/orientation add-page absence, and Designer overlap behavior.
- `/workspace/evidence/evidence-1121-1187-generated-pdf.webm`
  - Covers generated AcroForm support and missing Tagged PDF structure metadata.

## High-level findings

- Designer/table feature requests are mostly still missing in the UI: schema context menu, persistent grouping, table rotation, table border radius, merged cells, non-text table cells, per-overflow-page table height, per-page blank size/orientation, and configurable sidebar widths.
- Current `main` has meaningful partials:
  - Generated PDFs for blank base PDFs have dynamic table/page-break/reflow behavior, but the Designer still shows absolute-position overlap.
  - `@pdfme/generator` exports `generateForm()` and creates AcroForm fields for editable text/checkbox/radioGroup schemas, but existing-PDF AcroForm import/editing is not covered.
  - PDF metadata options are present, but Tagged PDF / PDF/UA structure support is absent.
