# Issue #26: Add Schema grouping function

- Status on current `main`: `partially_done`
- Suggested maintainer action: `keep / needs design`
- Evidence video: `/workspace/evidence/evidence-0026-0028-1310-designer-controls.webm`
  - 00:00-00:04: two schemas loaded in Designer.
  - 00:04-00:08: multiple schemas can be selected/transformed together.
  - 00:08-00:12: selecting/right-clicking a member does not expose Group/Ungroup or a persistent group.

## Rationale

Designer has transient multi-select and group transforms through Selecto/Moveable, so the narrow "move several selected objects together" behavior is present. The current schema model does not include a persistent grouping field, and the Designer has no Group/Ungroup command or behavior where selecting one saved group member reselects the group.

Code evidence:

- `packages/ui/src/components/Designer/Canvas/index.tsx` computes group transforms for currently active elements, not saved groups.
- `packages/ui/src/components/Designer/Canvas/Moveable.tsx` wires `onDragGroup`, `onResizeGroup`, and `onRotateGroup` for the active target list.
- `packages/common/src/schema.ts` defines the base `Schema` fields (`name`, `type`, `position`, `width`, `height`, optional `rotate`, etc.) with no `group`/group id property.

## Notes

This should stay open if pdfme wants persistent grouping semantics. It needs design for template serialization, copy/paste group-id remapping, selection behavior, and whether groups can span pages.
