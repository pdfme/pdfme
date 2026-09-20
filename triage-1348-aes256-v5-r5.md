# Issue #1348 - AES256Cipher._decrypt garbles V=5/R=5 encrypted PDFs in Node.js

- **Status on current main:** `needs_more_info`
- **Suggested maintainer action:** need-author-info

## Rationale

The report requires a PDF encrypted with AES-256 Standard Security Handler `V=5/R=5` and an empty user password. This workspace does not contain a suitable fixture, and fixture creation tools (`qpdf` or `pikepdf`) are not installed. The repo fixture `packages/pdf-lib/assets/pdfs/encrypted_new.pdf` requires a password and does not exercise the reported empty-password V=5/R=5 path.

Because the original issue is content/fixture-specific and the current workspace cannot synthesize a matching encrypted fixture, I could not verify whether the reported garbling still exists on current main. Maintainers should request a non-sensitive encrypted PDF or exact creation command/tool/version from the author.

## Evidence

- Video: `artifacts/batch-a/evidence-1348-aes256-v5-r5.mp4`
- Runtime log: `artifacts/batch-a/repro-output.txt`

Key runtime output:

```text
candidate packages/pdf-lib/assets/pdfs/encrypted_new.pdf did not provide a V=5/R=5 empty-password repro: NEEDS PASSWORD
No V=5/R=5 empty-password fixture or creation tool (qpdf/pikepdf) is available in this workspace.
```
