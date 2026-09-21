# Implementation Plan: Issue #696 Image/PDF Fit and Alignment

## Issue mapping

GitHub Issue: <https://github.com/pdfme/pdfme/issues/696>

The issue reports that when an image or PDF aspect ratio differs from the target area, pdfme currently gives no way to choose fit behavior or align the visible content. On current `main`, the built-in image plugin effectively does `contain + center`: PDF output resizes the image to fit and offsets the short axis by half the leftover space, and UI output uses CSS `object-fit: contain` with centered positioning.

This plan keeps the locked product decisions:

- Support both fit mode and alignment.
- Fit modes: `contain` and `cover`.
- Alignment applies only when fit is `contain`.
- Existing templates keep the current default: `contain + center`.
- Cover both image schemas and embedded/custom base PDF behavior where aspect-mismatch handling exists.

## Current code findings

### Image schema

Primary file:

- `packages/schemas/src/graphics/image.ts`

Current PDF behavior:

- Embeds PNG/JPEG, normalizes EXIF orientation, then computes image and box ratios.
- If the image is wider than the box, sets width to box width and centers vertically.
- Otherwise sets height to box height and centers horizontally.
- This is hard-coded `contain + center`.

Current UI behavior:

- Placeholder container uses `backgroundSize: 'contain'`, `backgroundPosition: 'center'`.
- Rendered `<img>` uses `objectFit: 'contain'` and no explicit `objectPosition`, so browser default is center.

Current prop panel:

- `propPanel.schema` is `{}` for image, so Designer only shows common controls.
- `propPanel.defaultSchema` has no image-specific fit/alignment fields.

### Embedded/custom PDF path

There is no separate built-in PDF field plugin under `packages/schemas`. Custom/embedded PDF in the current product is `template.basePdf`.

Relevant files:

- `packages/generator/src/helper.ts`
  - `getEmbedPdfPages()` loads custom `basePdf`, uses each source page crop box as the output page box, and embeds pages with matching bounding boxes.
  - `insertPage()` draws the embedded page onto a same-sized generated page.
- `packages/generator/src/generate.ts`
  - Offsets schema rendering by custom PDF crop-box origin.
- `packages/ui/src/hooks.ts`
  - Custom `basePdf` is rasterized with `pdf2img()` and page sizes are read with `pdf2size()`.
- `packages/ui/src/components/Paper.tsx`
  - Background image is painted at the page's own size: `backgroundSize: ${paperSize.width}px ${paperSize.height}px`.

Because custom `basePdf` pages currently define the generated page size, there is not an existing "fit PDF into a differently shaped schema box" code path comparable to image fields. If maintainers want Issue #696 to include fitting an uploaded PDF page into a fixed blank-paper area, that is a new base-PDF placement feature rather than a parallel schema tweak.

## Recommended API

Use CSS-familiar names on image schemas:

```ts
export type ImageObjectFit = 'contain' | 'cover';
export type ImageObjectPosition =
  | 'left top'
  | 'center top'
  | 'right top'
  | 'left center'
  | 'center center'
  | 'right center'
  | 'left bottom'
  | 'center bottom'
  | 'right bottom';

export type ImageSchema = Schema & {
  objectFit?: ImageObjectFit;
  objectPosition?: ImageObjectPosition;
};
```

Justification:

- The current image UI already uses CSS `objectFit` and `backgroundPosition`.
- The names map directly to browser rendering for Designer/Form/Viewer parity.
- A single `objectPosition` field avoids two separate image-only fields while still supporting top/bottom/left/right/center combinations.
- Existing text/table alignment names (`alignment`, `verticalAlignment`) are text-layout concepts; image fit maps more directly to CSS object rendering.

Default values:

```ts
objectFit: 'contain'
objectPosition: 'center center'
```

Backward compatibility:

- Existing templates without these fields render as `contain + center center`.
- `Schema` is currently `z.passthrough()` in `packages/common/src/schema.ts`, so no broad common schema migration is required.
- Add defaults to `image.propPanel.defaultSchema` for newly created image fields.
- Use a local normalizer in image rendering so malformed/missing values safely fall back to defaults.

## Cover/contain semantics

### Contain

- Entire source image is visible.
- Empty space may remain on one axis.
- `objectPosition` controls where the fitted image sits inside the schema box.

### Cover

- Source image fills the schema box.
- Overflow is cropped.
- Alignment is intentionally ignored per product decision #3.
- Use center-crop only for cover: `cover + center center`.
- The prop panel must hide `objectPosition` when `objectFit === 'cover'`.
- PDF and UI renderers should ignore any stored `objectPosition` when `objectFit === 'cover'`.

Recommendation: do not delete `objectPosition` when users switch to `cover`; just hide and ignore it. If they switch back to `contain`, their previous alignment is preserved.

## PDF render math

Add small helpers in `packages/schemas/src/graphics/image.ts`, or extract to `packages/schemas/src/graphics/fit.ts` if tests become cleaner:

```ts
const DEFAULT_OBJECT_FIT = 'contain' as const;
const DEFAULT_OBJECT_POSITION = 'center center' as const;

type AxisPosition = 'left' | 'center' | 'right' | 'top' | 'bottom';

const getFitBox = ({
  sourceWidth,
  sourceHeight,
  boxWidth,
  boxHeight,
  fit,
  objectPosition,
}) => {
  const scale =
    fit === 'cover'
      ? Math.max(boxWidth / sourceWidth, boxHeight / sourceHeight)
      : Math.min(boxWidth / sourceWidth, boxHeight / sourceHeight);

  const width = sourceWidth * scale;
  const height = sourceHeight * scale;

  const effectivePosition = fit === 'cover' ? 'center center' : objectPosition;
  const [xPos, yPos] = parseObjectPosition(effectivePosition);

  return {
    width,
    height,
    offsetX: alignOffset(boxWidth - width, xPos),
    offsetY: alignOffset(boxHeight - height, yPos),
  };
};
```

Alignment offsets:

- Horizontal:
  - `left`: `0`
  - `center`: `(boxWidth - renderedWidth) / 2`
  - `right`: `boxWidth - renderedWidth`
- Vertical in schema coordinates:
  - `top`: `0`
  - `center`: `(boxHeight - renderedHeight) / 2`
  - `bottom`: `boxHeight - renderedHeight`

For PDF drawing:

1. Convert the original schema box to PDF layout props to get the clipping rectangle in PDF coordinates.
2. Build a fitted draw schema:
   - `width = renderedWidth`
   - `height = renderedHeight`
   - `position.x = schema.position.x + offsetX`
   - `position.y = schema.position.y + offsetY`
3. Convert fitted schema with `convertForPdfLayoutProps()`.
4. For `contain`, call `page.drawImage(image, drawOptions)` as today.
5. For `cover`, wrap draw in a clipping path matching the original schema box:
   - `pdfLib.pushGraphicsState()`
   - `pdfLib.moveTo()`, `lineTo()`, `closePath()`, `clip()`, `endPath()`
   - `page.drawImage(image, drawOptions)`
   - `pdfLib.popGraphicsState()`

Clipping is necessary because `cover` intentionally draws larger than the schema box on one axis. The forked `@pdfme/pdf-lib` already exposes clipping operators used internally in `packages/pdf-lib/src/api/operations.ts`.

Rotation note:

- Current image rotation is applied through `convertForPdfLayoutProps()` and `page.drawImage`.
- Cover clipping should clip the visual schema box. If clipping before rotation creates an unrotated clipping rectangle, add focused tests for rotated cover images. If rotated clipping is too risky for the first pass, document and test the current rotation behavior and consider treating rotated cover as a follow-up.

## UI render behavior

File:

- `packages/schemas/src/graphics/image.ts`

For rendered images:

```ts
img.style.objectFit = schema.objectFit ?? 'contain';
img.style.objectPosition =
  (schema.objectFit ?? 'contain') === 'cover'
    ? 'center center'
    : (schema.objectPosition ?? 'center center');
```

For placeholder backgrounds:

```ts
container.style.backgroundSize = fit;
container.style.backgroundPosition = effectivePosition;
```

Designer, Form, and Viewer all call the plugin `ui` renderer through `packages/ui/src/components/Renderer.tsx`, so changing image `ui` keeps all three surfaces visually aligned.

## Prop panel behavior

File:

- `packages/schemas/src/graphics/image.ts`

Change `propPanel.schema` from `{}` to a function so it can inspect `activeSchema`:

```ts
schema: ({ activeSchema, i18n }) => {
  const objectFit = ((activeSchema as ImageSchema).objectFit ?? 'contain');
  const showObjectPosition = objectFit === 'contain';

  return {
    objectFit: {
      title: i18n('schemas.image.objectFit'),
      type: 'string',
      widget: 'select',
      default: 'contain',
      props: {
        options: [
          { label: i18n('schemas.image.fitContain'), value: 'contain' },
          { label: i18n('schemas.image.fitCover'), value: 'cover' },
        ],
      },
      span: 8,
    },
    objectPosition: {
      title: i18n('schemas.image.objectPosition'),
      type: 'string',
      widget: 'select',
      default: 'center center',
      hidden: !showObjectPosition,
      props: { options: IMAGE_OBJECT_POSITION_OPTIONS },
      span: 16,
    },
  };
};
```

Add i18n keys:

- `packages/common/src/schema.ts` `Dict`
- `packages/ui/src/i18n.ts` all language dictionaries

Suggested keys:

- `schemas.image.objectFit`
- `schemas.image.fitContain`
- `schemas.image.fitCover`
- `schemas.image.objectPosition`
- `schemas.image.positionLeftTop`
- `schemas.image.positionCenterTop`
- `schemas.image.positionRightTop`
- `schemas.image.positionLeftCenter`
- `schemas.image.positionCenterCenter`
- `schemas.image.positionRightCenter`
- `schemas.image.positionLeftBottom`
- `schemas.image.positionCenterBottom`
- `schemas.image.positionRightBottom`

If maintainers want less translation churn, labels can compose existing `schemas.left`, `schemas.center`, `schemas.right`, `schemas.top`, `schemas.middle`, `schemas.bottom` in English order, but explicit keys give better localization.

## Embedded PDF/basePdf plan

### Recommended first implementation

Do not add base-PDF fit/alignment controls in the first implementation unless maintainers want a larger template-level feature. The current custom `basePdf` path does not fit a PDF page into a mismatched target box; it makes the target page equal to the source page/crop box. Therefore there is no existing ratio-mismatch placement behavior to adjust in the same way as image schemas.

Document this explicitly in the issue/PR:

- Image fields: implement `objectFit` and `objectPosition`.
- Custom `basePdf`: no schema box exists today, so no prop-panel equivalent is available.

### If basePdf support is required for #696

Add a template-level object form for custom PDFs, preserving string/bytes compatibility:

```ts
type CustomPdfPlacementFit = 'contain' | 'cover';
type CustomPdfPlacementPosition = ImageObjectPosition;

type CustomPdfWithPlacement = {
  data: string | ArrayBuffer | Uint8Array;
  size: { width: number; height: number };
  objectFit?: CustomPdfPlacementFit;
  objectPosition?: CustomPdfPlacementPosition;
};

type BasePdf = BlankPdf | CustomPdf | CustomPdfWithPlacement;
```

Then update:

- `packages/common/src/schema.ts`
  - Extend `BasePdf` union.
- `packages/common/src/helper.ts`
  - `getB64BasePdf()` reads `.data` for object-form custom PDFs.
- `packages/generator/src/helper.ts`
  - For object-form custom PDFs, create output pages at `size`.
  - Draw each embedded source page using contain/cover math.
  - Clip for cover.
  - Adjust copied link annotations by the same scale and offset.
- `packages/ui/src/hooks.ts`
  - Rasterize source pages as today.
  - Store target page sizes from `basePdf.size`.
- `packages/ui/src/components/Paper.tsx`
  - Render background with CSS `background-size: contain|cover` and `background-position`.

This is materially larger than the image-schema work because it changes public `BasePdf` shape, generation page boxes, UI paper sizing, and annotation coordinate transforms.

## Tests

### Unit tests for image fit math

Recommended file:

- `packages/schemas/__tests__/image.test.ts`

Add exported or locally testable helpers if needed:

- `normalizeImageObjectFit()`
- `normalizeImageObjectPosition()`
- `getImageFitLayout()`

Cases:

- Missing fields => `contain + center center`.
- Invalid `objectFit`/`objectPosition` => defaults.
- `contain` wider image in taller box:
  - left/center/right changes x offset.
  - top/center/bottom changes y offset.
- `contain` taller image in wider box.
- `cover` uses max scale and always center offsets even if schema stores another objectPosition.

### PDF render tests

Recommended file:

- `packages/schemas/__tests__/image.test.ts`

Use the existing direct plugin test style with a tiny PNG and mocked/stubbed page where possible:

- Assert `page.drawImage()` receives expected `width`, `height`, `x`, `y` for `contain + left top`, `contain + right bottom`, and default center.
- Assert `cover` draws dimensions larger than one box axis and emits clipping operators before drawing.

If operator-level assertions are awkward, add a generator visual snapshot:

- `packages/generator/__tests__/generate.test.ts` for a minimal image template, or a new focused `image-fit.test.ts`.
- Use `pdfToImages()` and `getImageSnapshotOptions()` from `packages/generator/__tests__/utils.ts`.
- Include one snapshot for `cover` and one for non-center `contain`.

### UI tests

Recommended files:

- `packages/ui/__tests__/components/Designer.test.tsx`
- Or a focused schema UI test if adding one is easier.

Cases:

- Image prop panel shows `objectFit`.
- `objectPosition` is visible when `objectFit` is `contain`.
- `objectPosition` is hidden when `objectFit` is `cover`.
- Rendered `<img>` has matching `object-fit` and `object-position` styles in Designer/Form/Viewer render path.

### i18n/type tests

- `packages/common/src/schema.ts` Dict type will force all dictionaries in `packages/ui/src/i18n.ts` to include new keys.
- Run package typecheck/build to catch missing translations.

### BasePdf tests if object-form support is added

- `packages/generator/__tests__/base-pdf-link.test.ts`
  - Add a placement case proving link annotations are translated/scaled with contain offsets.
- `packages/ui/__tests__/hooks.test.tsx`
  - Object-form custom basePdf uses declared target `size`, not source page size.
- Visual snapshot for contain/cover PDF placement.

## Implementation steps

### Phase 1: Image schema support (recommended S/M)

1. Add image-specific types/constants/options in `packages/schemas/src/graphics/image.ts`.
2. Replace hard-coded PDF contain-center math with normalized fit-layout helper.
3. Add cover clipping in PDF render.
4. Update UI renderer to apply `objectFit` and effective `objectPosition` to both placeholder and `<img>`.
5. Add image prop-panel controls with `objectPosition.hidden` when fit is `cover`.
6. Add i18n keys to `packages/common/src/schema.ts` and `packages/ui/src/i18n.ts`.
7. Add unit tests for layout math and render arguments.
8. Add one or two visual snapshots only if direct render tests do not sufficiently cover clipping/cover output.

Rough size: M, about 180-300 LOC production plus 120-220 LOC tests, depending on helper extraction and snapshot coverage.

### Phase 2: BasePdf placement decision (recommended separate M/L if required)

1. Confirm desired public API for fitting a custom PDF into a target page size.
2. Add object-form custom basePdf type and validation.
3. Update generator embed/draw logic and annotation transforms.
4. Update UI paper/background rendering.
5. Add generator, UI, and link annotation tests.

Rough size: M/L, about 250-450 LOC production plus 180-300 LOC tests.

## Risks

- PDF cover requires clipping. Incorrect clipping order could crop unrotated coordinates when schemas are rotated.
- UI/PDF parity can drift if CSS `object-position` semantics and PDF offsets are not covered by shared tests.
- Adding i18n keys requires updating every dictionary in `packages/ui/src/i18n.ts`.
- BasePdf placement is a larger public API change than image schema alignment and may affect links/crop boxes.
- Storing `objectPosition` while fit is `cover` is intentional but should be documented so template JSON does not look surprising.

## Non-goals

- No free-form CSS `object-position` values such as percentages or pixel offsets in the first pass.
- No `fill`/`none`/`scale-down` fit modes.
- No cover alignment controls; cover is center-crop only.
- No migration script for existing templates because missing fields already map to current behavior.
- No separate PDF field plugin unless maintainers decide to introduce one.

## Success criteria

- Existing image templates render unchanged by default.
- Designer Image fields expose fit mode.
- Alignment choices appear only for `contain`.
- Generator output and Designer/Form/Viewer output match for contain alignment and cover center-crop.
- Issue #696 can be closed for image fields, with custom/base PDF either explicitly out of scope for the first PR or handled by the separate basePdf placement work above.
