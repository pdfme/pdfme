# Issue #555 - Advanced customisable QR Codes

Status: `still_missing`

## Rationale

- The QR schema is still the generic barcode plugin entry `barcodes.qrcode`.
- The QR default schema exposes content, size, opacity, `barColor`, and `backgroundColor`; QR-specific styling such as dot shape, eye style/color, logo embedding, gradients, or per-module styling is not present (`packages/schemas/src/barcodes/propPanel.ts`).
- Rendering is through `bwip-js` options in `createBarCode`; no `qr-code-styling`-style plugin is present in the repo or playground plugin list.

## Suggested action

Keep open, but consider labeling as an external/optional plugin candidate rather than core if dependency size remains a concern. If pursued, define a separate styled QR plugin package and add it to the playground only after library/browser/generator parity is proven.

## Evidence

- `evidence-0555-advanced-qr-codes.mp4`
