# Issue #1545 - Add strikeArea overlay schema

Status: `still_missing`

## Rationale

- Code search found no `strikeArea` type, plugin implementation, schema export, generator renderer, or playground registration.
- The current playground plugin list includes Text, Multi-Variable Text, Table, List, Line, Rectangle, Ellipse, Image, SVG, Signature, QR, Date/Time inputs, selection controls, Circle Mark, EAN13, and Code128, but no Strike Area.
- Existing `line` and shape schemas remain the closest available primitives; there is no semantic slash/cross overlay schema.

## Suggested action

Keep open as maintainer-filed feature work. Implementation should add a schemas plugin with native PDF line drawing, UI preview, prop-panel controls for `strikeType`, `color`, and `lineWidth`, and playground registration.

## Evidence

- `evidence-1545-strike-area-schema.mp4`
