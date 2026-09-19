# Issue #1546 - Add freeDraw schema

Status: `still_missing`

## Rationale

- Code search found no `freeDraw` type, plugin implementation, schema export, generator renderer, or playground registration.
- The existing `signature` plugin uses `signature_pad` and stores a PNG data URL, but its schema type, semantics, UI labels, default behavior, and playground entry remain `signature`.
- No shared freehand-drawing helper or transparent annotation schema has landed on current main.

## Suggested action

Keep open as maintainer-filed feature work. Reuse/extract signature canvas behavior where possible, but add a separate `freeDraw` plugin with transparent canvas behavior, stroke styling, clear/reset handling, and playground registration.

## Evidence

- `evidence-1546-free-draw-schema.mp4`
