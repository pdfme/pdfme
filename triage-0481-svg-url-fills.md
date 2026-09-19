# Issue #481 - Support SVG fills defined by url()

Status: `still_missing`

## Rationale

- The SVG schema delegates PDF rendering to `page.drawSvg(value, ...)` (`packages/schemas/src/graphics/svg.ts`).
- `packages/pdf-lib/src/api/svg.ts` parses `fill`/`stroke` through `colorString(...)`; there is no resolver for `fill="url(#...)"`, `linearGradient`, `radialGradient`, or pattern paint servers.
- Code search found no gradient/pattern support in the SVG rendering path, so SVGs with `url(#gradient)` fills are still expected to fail or render incorrectly.

## Suggested action

Keep open. Either document rasterization as the supported workaround or add explicit pdf-lib SVG paint-server support; native support likely belongs in the pdf-lib SVG renderer rather than the schema wrapper.

## Evidence

- `evidence-0481-svg-url-fills.mp4`
