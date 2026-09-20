# Issue #28: Add context menu in Designer

- Status on current `main`: `still_missing`
- Suggested maintainer action: `keep`
- Evidence video: `/workspace/evidence/evidence-0026-0028-1310-designer-controls.webm`
  - 00:08-00:12: right-clicking a selected schema shows no pdfme schema context menu.

## Rationale

The Designer canvas does not expose a right-click context menu for schemas. The only context-like menu found in current UI code is the control-bar ellipsis menu for page actions, and it only contains Add Page After / Remove Current Page.

Code evidence:

- `packages/ui/src/components/CtlBar.tsx` builds `contextMenuItems` only from `addPageAfter` and `removePage`.
- Searches in `packages/ui/src` show no Designer schema `onContextMenu` path or menu items for copy/cut/paste/duplicate/delete/bring-to-front/send-to-back.
- Existing copy/delete/order actions remain keyboard/sidebar driven rather than exposed through a right-click schema menu.

## Notes

Keep the issue open. A context menu should route to existing command handlers where possible, but the command surface and keyboard parity should be designed explicitly.
