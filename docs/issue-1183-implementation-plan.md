# Implementation brief: EXIF Orientation not reflected in PDF (#1183)

**Decision: GO with revisions.** The bake-before-embed design is confirmed, with the
revisions listed below. Every claim in this brief was validated empirically against
current `main` (prototype: EXIF/eXIf parser + pixel transform + jpeg-js / @pdf-lib/upng
bake, verified against libvips auto-orientation as the browser-equivalent gold
reference, and embedded through this repo's pdf-lib fork).

- Issue: https://github.com/pdfme/pdfme/issues/1183
- Prior closed attempt (do **not** revive): https://github.com/pdfme/pdfme/pull/1289
- Related geometry regression class to avoid: https://github.com/pdfme/pdfme/issues/382

---

## 1. Problem restated

Browsers apply EXIF Orientation when rendering `<img>` (CSS `image-orientation:
from-image` is the default), so the Designer/Form/Viewer show the photo upright.
The PDF path embeds the raw bytes:

- `packages/schemas/src/graphics/image.ts` → `pdfDoc.embedJpg(value)` /
  `embedPng(value)`; pdf-lib's `JpegEmbedder` reads only SOF markers (width/height/
  colorspace) and never looks at APP1/EXIF.
- Contain-fit math in `image.ts` uses `getImageDimension(value)`
  (`imagehelper.ts`), which also reads only SOF/IHDR — so for orientations 5–8 the
  width/height are swapped relative to what the user sees, and the fit box is wrong
  even before rotation is considered.

Result: Orientation=3 (the issue's reproduction, confirmed by the maintainer on
6.1.12) renders upside down; 5–8 render sideways **and** mis-fitted.

## 2. Product rule (maintainer constraint)

**JPEG and PNG must both be fixed in the same PR through one shared normalize
path.** No "JPEG fixed, PNG still wrong" split. PNG orientation lives in the `eXIf`
chunk (PNG 1.5+); its payload is the same TIFF structure as JPEG's APP1, so one
TIFF/IFD0 parser serves both containers.

## 3. Architecture (final — do not re-decide)

One format-agnostic normalize step inside the image schema's `pdf()` renderer,
before embedding and before dimension use:

```
value (data URL) ─→ bytes
  ├─ magic bytes = JPEG (ff d8)?  orientation := parse APP1 Exif IFD0 tag 0x0112
  ├─ magic bytes = PNG signature? orientation := parse eXIf chunk, same TIFF parser
  └─ other / no tag / tag == 1 / parse error → passthrough, byte-identical
orientation ∈ 2..8:
  decode to RGBA  (JPEG: jpeg-js · PNG: @pdf-lib/upng)
  transform pixels for orientation 2..8 (dimension swap for 5..8)
  re-encode        (JPEG: jpeg-js quality 90 · PNG: UPNG.encode cnum=0, lossless)
  → baked bytes carry no orientation tag (encoders write none)
embed baked bytes (embedJpg/embedPng accept Uint8Array — no re-base64)
dimensions for contain-fit := PDFImage.width / PDFImage.height (baked dims)
```

Key properties, all verified:

- **Gate first, decode later.** The ~90-LOC zero-dependency orientation parser runs
  on every image; the expensive decode/re-encode runs **only** when a tag 2–8 is
  present. Images without EXIF (the overwhelming majority) are byte-identical
  passthrough — zero perf cost, zero quality cost, zero behavior change.
- **No geometry changes.** `convertForPdfLayoutProps`, `schema.rotate`, and pdf-lib
  are untouched. EXIF rotation is baked into pixels, never expressed as a draw
  rotation, so it cannot double-apply with the existing center-pivot rotate path
  (the #382 class of bug) and composes correctly with the user-set rotate handle:
  browser rotates the auto-oriented image; PDF rotates the baked image. Identical.
- **Cache stays shape-compatible.** Key from the *original* value (existing
  fingerprint), value stays a `PDFImage`. On cache hit, baked dimensions come from
  `image.width`/`image.height` — same SOF/IHDR source `getImageDimension` reads, so
  the `getImageDimension(value)` call in `pdf()` is replaced, not augmented. The
  bake runs at most once per unique image per generation.
- **Viewer/PDF parity is by construction**: the browser is the reference (it applies
  the tag), and the bake applies the same tag the same way. This also covers
  "software rotated the pixels but left a stale tag" images — browsers follow the
  tag, so we do too.

### Where each edit lands

| File | Change |
|---|---|
| `packages/schemas/src/graphics/orientation.ts` (new) | TIFF/IFD0 orientation parser, JPEG APP1 scanner, PNG eXIf scanner, RGBA transform, `normalizeImageOrientation(bytes): Uint8Array` |
| `packages/schemas/src/graphics/image.ts` | In `pdf()`: dataURL→bytes, magic-byte format detection, normalize before embed, drop `getImageDimension` call in favor of `PDFImage` dims (~25 LOC) |
| `packages/schemas/package.json` | Add `jpeg-js` and `@pdf-lib/upng` to `dependencies` |
| `packages/schemas/__tests__/orientation.test.ts` (new) | See test plan |

`getImageDimension` in `imagehelper.ts` stays exported (internal module, but no
reason to churn it); it simply loses its one caller in `image.ts`.

## 4. Dependency decision

**Add `jpeg-js@^0.4.4` (new). Add `@pdf-lib/upng@^1.0.1` as a direct dependency
(already in the tree via `@pdfme/pdf-lib`). Nothing else. No `exifr`, no `pngjs`,
no `canvas`.**

| Option | Verdict | Why |
|---|---|---|
| `jpeg-js` | **Take** | Pure JS, zero deps, 76 KB unpacked, identical behavior Node/browser. Verified: decodes baseline, **progressive (SOF2)**, grayscale, and **CMYK/YCCK (Adobe)** JPEGs to RGBA; encoder produces baseline JFIF that this repo's `JpegEmbedder` accepts. Dormant since 2022 but the format is frozen; it is the de-facto pure-JS JPEG codec (used by tfjs et al.). |
| `@pdf-lib/upng` | **Take (not new)** | pdf-lib's own PNG decoder — pdf-lib already fully decodes every embedded PNG through it, so it is exercised in production here today. Exposes `decode`/`toRGBA8` **and** `encode` (cnum=0 = lossless). Verified: bake round-trip is pixel-bit-exact and re-embeds cleanly. Browser-safe (pako-based, no Node builtins). |
| `pngjs` | Reject | Requires Node `zlib`/`Buffer`, no `browser` field in package.json — breaks the browser bundle without polyfill work. 650 KB. Redundant given upng is already shipped. |
| `exifr` (per #1289) | Reject | Capable but ~10× the code needed; we read exactly one tag (IFD0 0x0112). The inline parser is ~90 LOC, fully unit-tested, and also covers PNG `eXIf`, which exifr's orientation shortcut doesn't target. |
| `canvas` (npm) / platform-split (per #1289) | Reject | Native module (node-gyp/prebuilds), platform-divergent output (browser canvas vs node-canvas re-encode differ), was the reason #1289 stalled. The whole point of the revision is one deterministic code path. |
| Lossless DCT transform (jpegtran-style) | Reject for now | No maintained pure-JS implementation; mozjpeg-WASM is megabytes. Revisit only if q90 re-encode quality draws complaints. |
| Zero-dep geometry approach (rotate/mirror at draw time) | Reject | Mirroring (orientations 2/4/5/7) needs negative-scale CTM ops pdf-lib's `drawImage` doesn't express; interacts with the center-pivot rotate correction; dimension swap leaks into contain-fit math. This is exactly the #382-shaped risk the plan exists to avoid — and it's why #1289's second half was never finished. |

## 5. Validated reference implementation

The following was tested against libvips (`sharp`) as gold. Orientations 1–8, both
containers. Copy semantics, not necessarily verbatim.

### 5.1 Orientation parse (shared TIFF + two container scanners)

```ts
/** TIFF/IFD0: returns 1..8 or undefined. Never throws. */
const parseTiffOrientation = (tiff: Uint8Array): number | undefined => {
  try {
    if (tiff.length < 8) return undefined;
    const le = tiff[0] === 0x49 && tiff[1] === 0x49; // 'II'
    if (!le && !(tiff[0] === 0x4d && tiff[1] === 0x4d)) return undefined; // 'MM'
    const v = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
    if (v.getUint16(2, le) !== 42) return undefined;
    const ifd = v.getUint32(4, le);
    if (ifd + 2 > tiff.length) return undefined;
    const n = v.getUint16(ifd, le);
    for (let i = 0; i < n; i++) {
      const e = ifd + 2 + i * 12;
      if (e + 12 > tiff.length) return undefined;
      if (v.getUint16(e, le) !== 0x0112) continue;
      if (v.getUint16(e + 2, le) !== 3) return undefined; // SHORT
      const val = v.getUint16(e + 8, le);
      return val >= 1 && val <= 8 ? val : undefined;
    }
    return undefined;
  } catch { return undefined; }
};

/** JPEG: scan APP1 'Exif\0\0' segments; stop at SOS/EOI. */
const getJpegOrientation = (b: Uint8Array): number | undefined => {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return undefined;
  let p = 2;
  while (p + 4 <= b.length) {
    if (b[p] !== 0xff) return undefined;
    const marker = b[p + 1];
    if (marker === 0xda || marker === 0xd9) return undefined; // SOS/EOI
    const size = (b[p + 2] << 8) | b[p + 3];
    if (marker === 0xe1 && size >= 8) {
      const s = b.subarray(p + 4, p + 2 + size);
      if (s[0] === 0x45 && s[1] === 0x78 && s[2] === 0x69 &&
          s[3] === 0x66 && s[4] === 0 && s[5] === 0)
        return parseTiffOrientation(s.subarray(6));
    }
    p += 2 + size;
  }
  return undefined;
};

/** PNG: scan chunks for eXIf (raw TIFF payload); stop at IDAT/IEND. */
const getPngOrientation = (b: Uint8Array): number | undefined => {
  // check 8-byte signature, then walk chunks: [len u32][type 4][data][crc 4]
  // on type === 'eXIf' → parseTiffOrientation(data)
  // on 'IDAT' | 'IEND' → undefined
};
```

Notes locked in by testing:
- Multiple APP1 segments (XMP is also APP1): the `Exif\0\0` prefix check skips XMP
  correctly; keep scanning.
- Only IFD0's tag 0x0112 is read. The thumbnail IFD1 orientation is ignored on
  purpose (browsers ignore it too).
- Any structural anomaly (truncated segment, bad byte order, offsets out of range,
  non-SHORT type, value outside 1–8) returns `undefined` → passthrough. Verified:
  a JPEG truncated mid-APP1 parses to `undefined` without throwing.

### 5.2 Pixel transform (single function, exhaustively unit-testable)

```ts
const ORIENTATION_SWAPS_DIMENSIONS = (o: number) => o >= 5;

/** (x,y) in source → (dx,dy) in destination; verified vs libvips for 1..8 */
// o=2: dx=w-1-x, dy=y          mirror horizontal
// o=3: dx=w-1-x, dy=h-1-y      rotate 180
// o=4: dx=x,     dy=h-1-y      mirror vertical
// o=5: dx=y,     dy=x          transpose            (swap w/h)
// o=6: dx=h-1-y, dy=x          rotate 90 CW         (swap w/h)
// o=7: dx=h-1-y, dy=w-1-x      transverse           (swap w/h)
// o=8: dx=y,     dy=w-1-x      rotate 270 CW        (swap w/h)
```

### 5.3 Bake + wiring in `image.ts` `pdf()`

```ts
// inside pdf(), replacing the current embed + getImageDimension block
const key = getCacheKey(schema, value);           // key from ORIGINAL value
let image = _cache.get(key) as PDFImage;
if (!image) {
  let bytes = dataUrlToBytes(value);              // Buffer.from(base64) as today
  const kind = detectByMagicBytes(bytes);         // 'jpeg' | 'png' | 'other'
  try {
    if (kind === 'jpeg') bytes = bakeJpegOrientation(bytes); // no-op if tag ∈ {∅,1}
    if (kind === 'png')  bytes = bakePngOrientation(bytes);  // no-op if tag ∈ {∅,1}
  } catch (e) {
    console.warn('[@pdfme/schemas] EXIF orientation bake failed; embedding original bytes:', e);
  }
  image = await (kind === 'png' ? pdfDoc.embedPng(bytes) : pdfDoc.embedJpg(bytes));
  _cache.set(key, image);
}
const imageWidth = px2mm(image.width);            // baked dims, incl. 5–8 swap,
const imageHeight = px2mm(image.height);          // correct on cache hits too
// …contain-fit and convertForPdfLayoutProps exactly as today…
```

```ts
// JPEG bake
const o = getJpegOrientation(bytes);
if (!o || o === 1) return bytes;
const raw = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 512 });
const t = transformRgba(raw.data, raw.width, raw.height, o);
return new Uint8Array(jpeg.encode({ data: t.data, width: t.width, height: t.height }, 90).data);

// PNG bake
const o = getPngOrientation(bytes);
if (!o || o === 1) return bytes;
const img = UPNG.decode(toArrayBuffer(bytes));
const rgba = new Uint8Array(UPNG.toRGBA8(img)[0]);
const t = transformRgba(rgba, img.width, img.height, o);
return new Uint8Array(UPNG.encode([t.data.buffer], t.width, t.height, 0)); // 0 = lossless
```

Locked-in details:
- **Format detection by magic bytes** (`ff d8` / PNG signature), not the
  `data:image/png;` prefix — mislabeled data URLs exist; `img2pdf.ts` already does
  it this way. Keep the existing "anything not PNG goes to `embedJpg`" dispatch for
  `other` so behavior for garbage input is unchanged (embedJpg throws, as today).
- **Failure policy: never fail generation because of the bake.** Any throw inside
  decode/transform/encode → warn + embed original bytes (today's behavior).
- jpeg-js encode **quality 90** (its default is 50 — do not omit). Encoder output
  carries no EXIF, so the orientation tag is gone by construction.
- `UPNG.encode` cnum=0 is lossless RGBA8; round-trip verified bit-exact.
- `embedJpg`/`embedPng` accept `Uint8Array` directly (checked in
  `PDFDocument.ts`) — no base64 re-encoding after the bake.

## 6. Stress-test results (all empirical, prototype on this VM)

| Case | Result |
|---|---|
| Orientations 1–8, JPEG | Parser matches libvips metadata 8/8; baked output matches auto-oriented gold (mean abs diff 1.2–1.6/255 = re-encode noise only); dims swap correct for 5–8; tag absent from output |
| Orientations in PNG `eXIf` | Parser reads chunk correctly (fixtures written by libvips); baked output **bit-exact** vs gold; tag absent from output |
| Missing EXIF / Orientation=1 | Byte-identical passthrough, no decode performed |
| Malformed EXIF (truncated APP1) | Parser returns `undefined`, no throw, passthrough |
| Already-baked (pixels rotated, stale tag) | Follows the tag — same as every browser; parity is preserved by definition since the browser is the reference |
| Progressive JPEG (SOF2) + tag | jpeg-js decodes progressive fine; output is baseline (fine for PDF) |
| CMYK/Adobe JPEG + tag | jpeg-js converts to RGB during decode; bakes and embeds fine. Note: baked CMYK becomes RGB (color shift possible; combo is rare — CMYK exports don't carry camera orientation; untagged CMYK passthrough unaffected and keeps pdf-lib's CMYK `Decode` handling) |
| 12 MP JPEG (4032×3024, o=6) | Bake 1.7 s total, ~230 MB transient heap, once per unique image (cached `PDFImage`); output 3024×4032 |
| 4 MP PNG (o=6) | Bake 554 ms |
| Baked bytes → this repo's pdf-lib | `embedJpg`/`embedPng` + `drawImage` + `save` all succeed |
| Width/height swap → contain-fit | Handled automatically by reading `PDFImage.width/height`; the current bug where 5–8 mis-fit the box disappears |

## 7. Tests to ship with the PR

All in `packages/schemas/__tests__/orientation.test.ts` (+ small additions to
`image.test.ts`). **No binary fixtures, no sharp devDependency**: build fixtures
in-test — encode a tiny asymmetric RGBA pattern with jpeg-js / UPNG, splice a
minimal APP1 (`Exif\0\0` + 26-byte TIFF, one IFD0 entry) or `eXIf` chunk
(`UPNG.crc` is exposed for the chunk CRC). The prototype proved this splice is
~15 lines and accepted by every parser tested.

1. Parser: orientations 1–8 × {JPEG APP1, PNG eXIf} × {II, MM byte order}; XMP-APP1
   before Exif-APP1; truncated/garbage APP1 → `undefined`; tag value 0/9 → `undefined`.
2. Transform: for each of 2–8 assert exact corner-pixel mapping and dim swap on an
   asymmetric 4×2 pattern (pure function, exact assertions).
3. Bake: passthrough is byte-identical for tag ∅/1; baked output has no tag;
   baked dims swapped for 5–8.
4. `image.pdf()` integration: orientation-6 JPEG in a wide box → drawn width/height
   reflect swapped dims (spy on `page.drawImage` args); second call (cache hit)
   yields identical draw args; bake failure (corrupt JPEG body with valid tag)
   falls back to original-bytes embed without throwing… note embedJpg needs a
   valid SOF, so use a truncated-scan-data fixture that decodes in pdf-lib but not
   jpeg-js, or assert the warn+rethrow path at the bake unit level instead.
5. Existing `image.test.ts` cache tests must pass unchanged (cache key/shape are
   untouched).
6. Manual/playground check before merge: issue #1183's attached Orientation=3 photo
   through Designer → generate; compare with macOS Preview/Chrome.

## 8. PR slicing

- **PR 1 (the fix — this brief):** everything in §3–§7. JPEG + PNG together, one
  normalize path, schemas package only. ~230 LOC product (parser 90, transform 45,
  bake 40, wiring 25, plumbing 30) + ~350 LOC tests. Two `package.json` dep lines.
- **Follow-up A — `@pdfme/converter` `img2pdf`:** same bug exists there
  (`img2pdf.ts` embeds raw bytes and sizes pages from `image.scale(1)`). Reuse the
  normalize module; decide there whether to lift it into a shared location or
  duplicate (~230 LOC). Converter already depends on pdf-lib, so `@pdf-lib/upng`
  and `jpeg-js` are the same cost. Out of scope for PR 1 to keep it reviewable.
- **Follow-up B — quality knob (only if requested):** expose JPEG re-encode quality
  via generator options. Default 90 is fine; don't add options preemptively.
- **Not planned:** HEIC (the file input accepts only `image/jpeg, image/png`; HEIC
  requires a heavy codec), WebP (same reason), lossless DCT transform (no viable
  pure-JS lib).

## 9. Non-goals and regression risks

**Non-goals (explicitly out of scope for PR 1):**
- No changes to `convertForPdfLayoutProps`, `rotatePoint`, or any layout math.
- No changes to `packages/pdf-lib` (its embedders are consumers of already-baked bytes).
- No UI-side changes — the browser already renders correctly; `ui()` keeps using
  the original data URL.
- No EXIF preservation: baked copies drop all metadata (GPS, camera info, ICC).
  Only the embedded copy is affected; the template's stored data URL is untouched.
- No attempt to "fix" images whose pixels were rotated but whose tag was left
  stale; the tag is authoritative (matches all browsers).

**Regression risks and their mitigations:**
- **#382-class double rotation:** structurally impossible here — no rotation is
  added to the draw path; `schema.rotate` continues to be the only draw-time
  rotation, applied to baked pixels exactly as the browser applies CSS rotation to
  the auto-oriented `<img>`.
- **Quality loss on JPEG bake:** one lossy generation at q90, only for tagged
  images (which today render *wrong*, so this is strictly an improvement). ICC
  profile drop can shift colors slightly for wide-gamut (Display P3 iPhone)
  photos — accepted; any decode-based fix (incl. #1289's canvas) has this.
- **PNG normalization:** baked PNGs become 8-bit RGBA (16-bit depth reduced,
  palette expanded, `iCCP`/`gAMA` dropped). Only for PNGs carrying `eXIf`
  orientation ≠ 1, which are vanishingly rare. Note pdf-lib *already* decodes every
  PNG through the same UPNG `toRGBA8` path when embedding, so the PDF-visible pixel
  data goes through this normalization today regardless.
- **Perf/memory:** ~1.7 s + ~230 MB transient for a 12 MP tagged JPEG, once per
  unique image. Bounded by jpeg-js `maxMemoryUsageInMB: 512` (and its 100 MP
  resolution cap); failures fall back to original-byte embed.
- **Old-browser PNG preview mismatch:** browsers that don't honor PNG `eXIf` in
  `<img>` (older Safari) will preview a tagged PNG un-rotated while the PDF is
  rotated. The PDF is spec-correct; not our bug to chase.
- **Bundle size:** +76 KB unpacked (jpeg-js) in `@pdfme/schemas`; upng/pako already
  shipped via pdf-lib.

## 10. Final verdict

**GO with revisions**, the revisions being exactly:
1. PNG included in PR 1 via `@pdf-lib/upng` (maintainer constraint; zero new deps
   for PNG) — one shared normalize path, not a JPEG special case.
2. Zero-dep inline orientation parser as the gate; `jpeg-js` is the only new
   dependency. No `pngjs`, no `exifr`, no `canvas`, no platform split.
3. Dimensions from `PDFImage.width/height` instead of re-parsing with
   `getImageDimension` — fixes the 5–8 contain-fit swap and keeps the cache-hit
   path correct with no cache shape change.
4. Hard failure policy: bake errors warn and fall back to original bytes;
   generation never fails because of orientation handling.
5. Format detection by magic bytes, not data-URL prefix.
