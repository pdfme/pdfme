# Issue #1187: AcroForm Support

- Status on current `main`: `partially_done`
- Suggested maintainer action: `keep`
- Evidence video: `/workspace/evidence/evidence-1121-1187-generated-pdf.webm`
  - 00:00-00:03: live Playground Designer with an editable `patientName` text schema.
  - 00:03-00:10: the same recorded browser tab opens the generated AcroForm PDF in Chrome's PDF viewer.

## Rationale

Current `main` includes generator-side AcroForm creation through `generateForm()`. Editable text, checkbox, and radioGroup schemas can be converted into AcroForm fields in newly generated PDFs.

The broader issue is not fully satisfied: there is no Designer workflow for importing existing AcroForm fields from an uploaded PDF, editing underlying PDF content, auto-creating a template from existing fields, or preserving/modifying pre-existing AcroForm fields as first-class Designer objects.

The evidence video is a real screen recording only; the AcroForm field presence is also backed by code/tests below.

Code evidence:

- `packages/generator/src/index.ts` exports `generateForm`.
- `packages/generator/src/generateForm.ts` converts editable `text`, `checkbox`, and `radioGroup` schemas into internal AcroForm schema types.
- `packages/generator/src/acroForm.ts` creates text fields, check boxes, and radio groups with pdf-lib.
- `packages/generator/__tests__/acroform.test.ts` verifies text, checkbox, radio group, required fields, font resources, and duplicate-name handling.

## Notes

Keep open unless maintainers split it. A narrower "create AcroForm fields from pdfme schemas" task could be closed as done, but this issue also asks for existing-PDF AcroForm detection/editing.
