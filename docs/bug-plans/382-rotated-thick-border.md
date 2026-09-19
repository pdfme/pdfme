# Bug plan: Rotating a thick-bordered rectangle yields different PDF and UI renderings

- Issue: [pdfme/pdfme#382](https://github.com/pdfme/pdfme/issues/382)
- Status: **Investigation complete — plan only, fix not yet implemented**
- Affected package: `@pdfme/schemas` (rectangle plugin, `packages/schemas/src/shapes/rectAndEllipse.ts`)
- Verdict: **GO** (see bottom)

## Symptom

A rectangle with a thick border and a non-zero `rotate` renders in a different position in the
generated PDF than in the Designer/Form/Viewer UI. The maintainer re-confirmed on 6.1.12
(issue comment, 2026-09-14): with a 10 mm border at 45° the PDF rectangle visibly shifts
relative to reference lines while the UI rectangle stays aligned. At `rotate: 90` the
rectangle disappears from the PDF entirely.

The ellipse and line schemas are **not** affected (analysis below).

## How each side renders

### UI (`shape.ui` in `rectAndEllipse.ts`)

The plugin renders a `div` with `width/height: 100%`, `box-sizing: border-box`, and
`border-width: <borderWidth>mm`. The border is therefore drawn **entirely inside** the
schema box. The wrapper in `packages/ui/src/components/Renderer.tsx` applies
`transform: rotate(...)` with the default CSS `transform-origin` — the **center of the box**.

### PDF (`shape.pdf`)

`convertForPdfLayoutProps` (`packages/schemas/src/utils.ts`) converts the schema to PDF
coordinates and, to emulate the UI's center rotation, pre-rotates the box's bottom-left
corner around the box center (pdf-lib rotates around the rectangle's own `(x, y)` anchor,
not the center). This part is correct and shared by all plugins.

pdf-lib's `drawRectangle` (`packages/pdf-lib/src/api/operations.ts`) then emits
`translate(x, y); rotate(θ); <path 0,0 → w,h>; stroke`, where the stroke is **centered on
the path** with `lineWidth = borderWidth`.

To match CSS's inside border with PDF's centered stroke, the stroke path must be inset by
`borderWidth / 2` on every side **in the rectangle's local (rotated) coordinate frame**:
shrink the path to `(w − bw, h − bw)` and shift the anchor by the local offset
`(bw/2, bw/2)` **rotated by θ**.

## Root cause

The shrink is done correctly, but the anchor offset is wrong. Current code
(`packages/schemas/src/shapes/rectAndEllipse.ts`, rectangle branch):

```ts
x: position.x + borderWidth * ((1 - Math.sin(toRadians(rotate))) / 2) + Math.tan(toRadians(rotate)) * Math.PI ** 2,
y: position.y + borderWidth * ((1 + Math.sin(toRadians(rotate))) / 2) + Math.tan(toRadians(rotate)) * Math.PI ** 2,
```

The geometrically correct offset — the vector `(bw/2, bw/2)` rotated by θ — is:

```
dx = (bw/2) · (cos θ − sin θ)
dy = (bw/2) · (sin θ + cos θ)
```

The current formula replaces `cos θ` with `1` and adds an empirical correction term
`tan(θ) · π²` (≈ 9.87·tan θ pt). This was introduced in
[PR #695](https://github.com/pdfme/pdfme/pull/695) (commit `0e1e0554`); before that the code
used the plain unrotated `borderWidth / 2` offset, which is only correct at θ = 0.

The `tan(θ)·π²` term is a curve-fit to the single case in the original issue #382 template
(25 mm border, 45° rotation), where it lands within ~0.5 pt of the correct value. It is
**independent of `borderWidth`**, so it is wrong for every other border width, and it uses
`tan`, which diverges at 90°.

Numerical error of the current formula vs. the correct offset (pt; 1 mm ≈ 2.83 pt):

| borderWidth | rotate 30° | rotate 45° | rotate 60° | rotate 89° | rotate 90° |
| --- | --- | --- | --- | --- | --- |
| 1 mm | −5.51 | −9.45 | −16.39 | −564 | ~−1.6 × 10¹⁷ |
| 10 mm | −3.80 | −5.72 | −10.01 | −552 | ~−1.6 × 10¹⁷ |
| 25 mm | −0.95 | +0.51 | +0.62 | −531 | ~−1.6 × 10¹⁷ |

(Error identical in x and y. Reproduce with the snippet in "Verification" below.)

This exactly matches the observed behavior: the original 25 mm/45° case looks "closely
aligned", a 10 mm border is visibly shifted (~2 mm), and at 90° `Math.tan(π/2)` ≈ 1.6 × 10¹⁶
throws the rectangle off the page (it "disappears").

### Why ellipse and line are fine

- **Ellipse**: drawn via `drawEllipse` with its center at the box center, which is invariant
  under center rotation, and pdf-lib's `drawEllipseCurves` rotates around that center.
  The `xScale/yScale` inset of `bw/2` correctly converts the centered stroke to an inside
  border. No positional error possible.
- **Line** (`packages/schemas/src/shapes/line.ts`): the PDF renderer rotates the segment
  endpoints around the box center with `rotatePoint`, and the centered stroke thickness
  matches the UI's full-height div. Consistent with the UI. (The issue's parenthetical
  "might be an issue with the Line schema" does not reproduce on current main.)

## Fix plan

Single-file change in `packages/schemas/src/shapes/rectAndEllipse.ts`, rectangle branch of
`shape.pdf`. Replace the fudged offset with the rotated local inset. The existing
`rotatePoint` util expresses this cleanly:

```ts
// position is the (already center-rotated) bottom-left anchor of the full box.
// Inset the stroke path by borderWidth/2 in the box's local rotated frame.
const inset = rotatePoint(
  { x: position.x + borderWidth / 2, y: position.y + borderWidth / 2 },
  position,
  rotate.angle,
);

page.drawRectangle({
  x: inset.x,
  y: inset.y,
  width: width - borderWidth,
  height: height - borderWidth,
  ...(radius ? { radius: mm2pt(radius) } : {}),
  ...drawOptions,
});
```

Notes:

- `rotate.angle` is already the negated angle (`-schema.rotate`) that pdf-lib consumes, so
  no extra sign handling is needed; `rotatePoint` takes degrees.
- The `toRadians` import from `@pdfme/pdf-lib` becomes unused and should be removed.
- `width − bw` / `height − bw` shrink and the `radius` handling are already correct and stay.
- At `rotate: 0` the new formula reduces to the old pre-#695 `+ borderWidth / 2`, so all
  existing snapshots for unrotated shapes (`shapes.json` cases) must not change.
- No UI change: the UI rendering is the reference behavior.
- Edge cases to keep in mind (unchanged behavior, but worth asserting): `borderWidth: 0`
  (offset degenerates to 0), fill-only rectangles, `radius > 0` with rotation.

## Test plan

1. **Generator image-snapshot coverage (the gap that let this regress).**
   `packages/generator/__tests__/assets/templates/shapes.json` currently contains **no
   rotated rectangle** (only an ellipse at 45° and a line at 90°). Add rotated
   thick-border rectangles — e.g. `borderWidth: 10` at `rotate: 45`, `rotate: 90`, and
   `rotate: 135`, plus one rotated `radius > 0` case — either to `shapes.json` or a new
   `rotatedShapes.json` template wired into
   `packages/generator/__tests__/integration-other.test.ts`, with reference lines marking
   the expected outer edges. Generate the new `__image_snapshots__` baseline **after** the
   fix and visually verify the rectangle stays inside its box against the reference lines.
2. **Unit test for the offset math** in `packages/schemas/__tests__/` (new
   `shapes.test.ts`): call `rectangle.pdf` with a stub `page` (mock `drawRectangle`,
   `getHeight`) and assert the computed `x`/`y` for a table of angles (0/30/45/90/180) and
   border widths against closed-form expectations. This pins the geometry without relying
   on image diffs.
3. **Regression check**: run `npm run test -w packages/generator` and confirm the existing
   `shapes-1.png` and `rotation-1.png` snapshots are unchanged (all current cases are
   rotation-free rectangles or non-rectangle shapes).
4. **Manual playground check** with the issue's template (converted to current schema
   format): compare Designer vs. generated PDF at border widths 1/10/25 mm and rotations
   45°/90°, matching the maintainer's 2026-09-14 reproduction.

## Verification snippet (root-cause reproduction)

```js
const th = (deg) => (-deg * Math.PI) / 180; // pdf-lib angle for schema.rotate=deg
const current = (bw, d) => bw * ((1 - Math.sin(th(d))) / 2) + Math.tan(th(d)) * Math.PI ** 2;
const correct = (bw, d) => (bw / 2) * (Math.cos(th(d)) - Math.sin(th(d)));
// current(mm2pt(10), 45) - correct(mm2pt(10), 45) ≈ -5.72 pt ≈ -2 mm  → visible shift
// current(anything, 90) ≈ -1.6e17                                     → rectangle off-page
```

## Risk assessment

- Change is confined to two expressions in one plugin; ellipse, line, and all other
  plugins untouched.
- The θ = 0 case is provably identical to today's output, so unrotated documents (the vast
  majority) cannot regress.
- Rotated thick-border output will intentionally change — including for the tuned 25 mm/45°
  case (by ~0.5 pt, imperceptible). Snapshot updates are expected and correct.

## GO/NO-GO

**GO.** The root cause is a closed-form geometry error with a provably correct replacement,
the fix is a two-line expression change plus one import removal, and the test plan closes
the coverage gap (no rotated rectangle in any snapshot template) that allowed PR #695's
curve-fit to merge.
