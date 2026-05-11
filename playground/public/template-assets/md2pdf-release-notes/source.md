# Release Notes

This preset is useful for checking how md2pdf handles headings, task lists, tables, and longer paragraphs.

## Highlights

- [x] JSX playground with Monaco editor
- [x] md2pdf live preview
- [ ] Remote image fetching
- [ ] Rich inline content inside table cells

## Changes

| Area | Change | Notes |
| --- | --- | --- |
| Playground | Added presets | Selector is intentionally simple |
| JSX | Viewer and Form preview | Input-backed fields can be edited |
| Markdown | Partial GFM support | Complex nested blocks are simplified |

## Notes

Longer documents are converted into regular pdfme schemas. Paragraphs use expandable text schemas, while tables and images still need keep-together improvements.
