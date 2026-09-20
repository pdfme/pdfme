# Issue #1310: Constant properties like SIDEBAR_WIDTH can be edited

- Status on current `main`: `still_missing`
- Suggested maintainer action: `keep / needs design`
- Evidence video: `/workspace/evidence/evidence-0026-0028-1310-designer-controls.webm`
  - 00:12-00:15: Designer shows fixed left sidebar rail and no width controls.

## Rationale

The Designer supports Ant Design theme token overrides, but sidebar dimensions are still exported constants and used directly in layout calculations. There is no `Designer` option to override `LEFT_SIDEBAR_WIDTH` or `RIGHT_SIDEBAR_WIDTH`.

Code evidence:

- `packages/ui/src/constants.ts` sets `LEFT_SIDEBAR_WIDTH = 45` and `RIGHT_SIDEBAR_WIDTH = 400`.
- `packages/ui/src/components/Designer/index.tsx`, `LeftSidebar.tsx`, `RightSidebar/index.tsx`, and `Canvas/index.tsx` import and use those constants directly.
- `packages/common/src/schema.ts` `UIOptions` accepts labels/theme/options, but there is no sidebar-width option.
- `packages/ui/src/theme.ts` only defines Ant Design theme tokens/component defaults, not structural Designer dimensions.

## Notes

Keep open. A design pass should decide whether structural dimensions belong in `options`, theme tokens, CSS variables, or component layout props.
