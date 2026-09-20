# Issue #460 - CMYK option does not apply to QR codes

- **Status on current main:** `reproduces`
- **Suggested maintainer action:** keep

## Rationale

Current main (`7501849ebe917e098e0a22569a1f338bf0fcc978`) still renders QR/barcode schemas as embedded PNG images. The barcode PDF renderer calls `createBarCode(...)`, embeds the result with `pdfDoc.embedPng(...)`, and draws it with `page.drawImage(...)`; it does not use `options.colorType` for the barcode image path.

Runtime reproduction generated a QR code with `options.colorType: 'cmyk'` and inspected the output PDF dictionaries. The embedded QR image reports `/ColorSpace /DeviceRGB`, so the print-color limitation remains.

## Evidence

- Video: `artifacts/batch-a/evidence-460-cmyk-qr.mp4`
- Generated PDF: `artifacts/batch-a/issue-460-cmyk-qr.pdf`
- Runtime log: `artifacts/batch-a/repro-output.txt`

Key runtime output:

```text
embedded XObject color spaces: [{"name":"raw","colorSpace":"/DeviceRGB"}]
```
