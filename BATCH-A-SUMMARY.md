# Batch A bug triage summary

Current main checked: `7501849ebe917e098e0a22569a1f338bf0fcc978`

| Issue | Title | Status on current main | Suggested maintainer action | Primary evidence |
|---:|---|---|---|---|
| #460 | CMYK option does not apply to QR codes | `reproduces` | keep | `artifacts/batch-a/evidence-460-cmyk-qr.mp4` |
| #495 | Viewer with large PDF size >20 MB | `needs_more_info` | need-author-info | `artifacts/batch-a/evidence-495-large-pdf-viewer.mp4` |
| #623 | Renderer does not consider when PDF CropBox != MediaBox | `fixed_already` | close-as-fixed | `artifacts/batch-a/evidence-623-cropbox-mediabox.mp4` |
| #638 | generate() takes a blank space as a line break when CJK | `fixed_already` | close-as-fixed | `artifacts/batch-a/evidence-638-cjk-space-wrap.mp4` |
| #1348 | AES256Cipher._decrypt garbles V=5/R=5 encrypted PDFs in Node.js | `needs_more_info` | need-author-info | `artifacts/batch-a/evidence-1348-aes256-v5-r5.mp4` |
| #1397 | The undo function is incorrect when adding pages | `reproduces` | keep | `artifacts/batch-a/evidence-1397-designer-undo-browser.mp4` |
| #1433 | SVG schema plugin does not pass fonts to page.drawSvg() | `reproduces` | keep | `artifacts/batch-a/evidence-1433-svg-japanese-fonts.mp4` |

## Evidence videos

- `artifacts/batch-a/evidence-460-cmyk-qr.mp4`
- `artifacts/batch-a/evidence-495-large-pdf-viewer.mp4`
- `artifacts/batch-a/evidence-623-cropbox-mediabox.mp4`
- `artifacts/batch-a/evidence-638-cjk-space-wrap.mp4`
- `artifacts/batch-a/evidence-1348-aes256-v5-r5.mp4`
- `artifacts/batch-a/evidence-1397-designer-undo-browser.mp4`
- `artifacts/batch-a/evidence-1397-designer-undo-simulated.mp4`
- `artifacts/batch-a/evidence-1433-svg-japanese-fonts.mp4`

## Per-issue files

- `triage-460-cmyk-qr.md`
- `triage-495-large-pdf-viewer.md`
- `triage-623-cropbox-mediabox.md`
- `triage-638-cjk-space-wrap.md`
- `triage-1348-aes256-v5-r5.md`
- `triage-1397-designer-undo-pages.md`
- `triage-1433-svg-nonlatin-fonts.md`
