# Issue #696 - Alignment of image or PDF when ratio differs

Status: `still_missing`

## Rationale

- Image PDF rendering always preserves aspect ratio and centers the result by adding half of the unused width/height to `position.x`/`position.y` (`packages/schemas/src/graphics/image.ts`).
- The image UI uses `objectFit: 'contain'` and centered background positioning.
- No schema properties or prop-panel controls exist for top/bottom/left/right image alignment. I also found no equivalent alignment option for embedded PDF placement.

## Suggested action

Keep open. Add a schema/API design for image and embedded-PDF fit/alignment, probably with defaults preserving current center-contain behavior for backward compatibility.

## Evidence

- `evidence-0696-image-pdf-alignment.mp4`
