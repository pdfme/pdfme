# Batch D triage summary - schemas / PDF / misc features

Investigated on current `main` after fetching `origin/main`; local `main` and `origin/main` both resolved to `7501849ebe917e098e0a22569a1f338bf0fcc978`.

Evidence videos are no longer intended to be consumed from this branch. Corrected follow-up comments were posted on each GitHub issue with real attached videos using GitHub issue attachments. UI evidence was captured from a local playground at `http://localhost:5173/` after building the required workspaces (`pdf-lib`, `common`, `converter`, `schemas`, `generator`, `ui`, and `jsx`). API evidence was captured from real GUI terminal sessions running `rg` and Node commands against the repository.

| Issue | Status | Short rationale | Suggested action | Evidence |
| --- | --- | --- | --- | --- |
| #391 | `still_missing` | Generator has internal preprocessing/postProcessing helpers, but no public hook options in strict `GenerateProps`/`GeneratorOptions`. | Keep open; design typed pre/post hook API. | `evidence-0391-generate-hooks.mp4` |
| #481 | `still_missing` | SVG rendering delegates to pdf-lib color parsing; no `url(#...)` gradient/pattern paint-server support. | Keep open or document rasterization workaround; native fix belongs in SVG/pdf-lib renderer. | `evidence-0481-svg-url-fills.mp4` |
| #500 | `partially_done` | `options.labels` and plugin `i18n` exist, but dictionaries and `Dict` typing remain centralized. | Keep open as plugin-i18n architecture/RFC. | `evidence-0500-plugin-i18n-structure.mp4` |
| #555 | `still_missing` | QR is still the generic bwip-js barcode plugin with basic color/background only. | Keep open; consider separate styled QR plugin/package. | `evidence-0555-advanced-qr-codes.mp4` |
| #637 | `partially_done` | Dynamic page splitting exists for table/list/expandable text, but there is no manual `pageBreak` schema. | Keep open; clarify page-break marker vs keep-with-next/group behavior. | `evidence-0637-page-break-schema.mp4` |
| #671 | `still_missing` | No iterable group/section schema or repeated arbitrary child layout system. | Keep open; needs design proposal across data binding, Designer, and dynamic layout. | `evidence-0671-iterable-group.mp4` |
| #696 | `still_missing` | Image PDF/UI rendering is hard-coded to center-contain; no alignment controls. | Keep open; add fit/alignment schema design preserving defaults. | `evidence-0696-image-pdf-alignment.mp4` |
| #707 | `still_missing` | Text schema/rendering has no upper/lower/text-transform property or UI control. | Keep open; add transform enum consistently to UI, measurement, PDF rendering. | `evidence-0707-text-case-transform.mp4` |
| #926 | `still_missing` | Playground font map is fixed; no upload/register custom font flow. | Keep open as playground feature; decide font asset persistence model first. | `evidence-0926-playground-custom-font-upload.mp4` |
| #1234 | `still_missing` | `blob:http` font data still falls through to base64 decoding; safe fetch path is HTTP/HTTPS only. | Keep open; update dispatch and URL policy/tests if accepted. | `evidence-1234-blob-http-fonts.mp4` |
| #1244 | `partially_done` | Encrypted base PDF loading exists, but output PDF encryption API is absent. | Keep open, scoped to output encryption/writer support. | `evidence-1244-pdf-encryption.mp4` |
| #1418 | `partially_done` | Dynamic layout now covers more built-ins, but dispatch is still hard-coded and not plugin-provided. | Keep open as plugin dynamic-layout hook design. | `evidence-1418-custom-schema-dynamic-height.mp4` |
| #1545 | `still_missing` | No `strikeArea` type/export/plugin/playground registration found. | Keep open; implement schemas/UI/generator plugin and register in playground. | `evidence-1545-strike-area-schema.mp4` |
| #1546 | `still_missing` | No `freeDraw` type/export/plugin/playground registration found; only `signature` exists. | Keep open; add separate transparent freehand annotation plugin reusing signature internals where safe. | `evidence-1546-free-draw-schema.mp4` |

## Per-issue notes

- `triage-0391-generate-hooks.md`
- `triage-0481-svg-url-fills.md`
- `triage-0500-plugin-i18n-structure.md`
- `triage-0555-advanced-qr-codes.md`
- `triage-0637-page-break-schema.md`
- `triage-0671-iterable-group.md`
- `triage-0696-image-pdf-alignment.md`
- `triage-0707-text-case-transform.md`
- `triage-0926-playground-custom-font-upload.md`
- `triage-1234-blob-http-fonts.md`
- `triage-1244-pdf-encryption.md`
- `triage-1418-custom-schema-dynamic-height.md`
- `triage-1545-strike-area-schema.md`
- `triage-1546-free-draw-schema.md`
