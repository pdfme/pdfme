# Issue #1244 - Add ability to encrypt a PDF

Status: `partially_done`

## Rationale

- The forked pdf-lib can detect and load encrypted PDFs, and generator exposes `options.basePdfPassword` for password-protected base PDFs.
- Tests cover loading permission-encrypted PDFs and reporting password-required base PDFs (`packages/generator/__tests__/generate.test.ts`).
- There is still no public API to write/encrypt output PDFs with owner/user passwords or permissions. `PDFDocument.create()` and `save()` do not expose an encryption options surface.

## Suggested action

Keep open, but narrow the title/description to output encryption. Existing input decryption support should be documented separately from the missing writer/encryption feature.

## Evidence

- `evidence-1244-pdf-encryption.mp4`
