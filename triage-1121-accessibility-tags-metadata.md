# Issue #1121: Accessibility, Tags/Structure & Metadata

- Status on current `main`: `partially_done`
- Suggested maintainer action: `keep / needs design`
- Evidence video: `/workspace/evidence/evidence-1121-1187-generated-pdf.webm`
  - 00:00-00:03: generated PDF viewer opens.
  - 00:03-00:09: inspection summary shows metadata path exists but `StructTreeRoot=false` and `MarkInfo=false`.

## Rationale

Generator-level document metadata is supported through options such as author, title, subject, keywords, language, creator, producer, and dates. Tagged PDF / PDF/UA structure support is not present: generated documents do not create a structure tree, role map, marked-content IDs, or MarkInfo entries.

Code evidence:

- `packages/common/src/schema.ts` includes generator options for `author`, `creationDate`, `creator`, `keywords`, `lang`, `modificationDate`, `producer`, `subject`, and `title`.
- `packages/generator/src/helper.ts` post-processing writes those metadata fields through pdf-lib.
- Searches in `packages/pdf-lib/src` show AcroForm and basic marked-content operators, but no high-level StructTreeRoot/Tagged PDF serialization path used by pdfme generation.

## Notes

Keep open. If maintainers want to narrow it, split "metadata" from "Tagged PDF / PDF/UA"; metadata is already present, while structure/tags require substantial pdf-lib and renderer work.
