# Issue #391 - Add generate preprocessing/postprocessing hooks

Status: `still_missing`

## Rationale

- `GenerateProps` is strict and `GeneratorOptions` only includes metadata/font/color/base-PDF-password options; there are no public `preprocessing` or `postProcessing` callback options (`packages/common/src/schema.ts`).
- `packages/generator/src/generate.ts` calls internal helpers named `preprocessing` and `postProcessing`, but those only build the `PDFDocument`, plugin render map, and set document metadata.
- Callers can pre-process inputs/templates before `generate()` themselves, but there is still no in-generator hook and no access to the generated `PDFDocument` before `save()` for signing, encryption, PDF/A conversion, etc.

## Suggested action

Keep open as a generator API design issue. Define a typed hook contract for input/template transformation and PDF-document post-processing, including ordering with validation, dynamic layout, metadata, and `pdfDoc.save()`.

## Evidence

- `evidence-0391-generate-hooks.mp4`
