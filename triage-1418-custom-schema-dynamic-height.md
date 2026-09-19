# Issue #1418 - Support custom schema with dynamic height

Status: `partially_done`

## Rationale

- Dynamic layout is now generalized across multiple built-ins (`table`, `list`, expandable `text`, expandable `multiVariableText`) rather than table only.
- The dispatch is still hard-coded in `packages/schemas/src/dynamicLayout.ts`; it does not consult registered plugins for a `measure`, `getDynamicLayout`, or `hasDynamicHeights` hook.
- Custom schemas can provide PDF/UI/propPanel renderers, but there is no plugin-level dynamic-height contract consumed by `generate()`.

## Suggested action

Keep open, retitled toward "plugin-provided dynamic layout hooks". Define the plugin API before implementation so custom table-like schemas can opt in without patching the built-in switch.

## Evidence

- `evidence-1418-custom-schema-dynamic-height.mp4`
