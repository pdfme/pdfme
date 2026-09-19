# Issue #500 - Improve translations structure for plugins

Status: `partially_done`

## Rationale

- Runtime overrides exist through `UIOptions.labels`, and the UI passes an `i18n` function into plugin renderers/prop panels.
- The translation key schema is still centralized in `packages/common/src/schema.ts` as a strict `Dict` containing built-in schema keys.
- Built-in dictionaries still live in `packages/ui/src/i18n.ts`; plugins do not export self-contained translation bundles that are merged at registration time.

## Suggested action

Keep open as an architecture/refactor issue. A practical next step is an RFC or small proposal for plugin-provided dictionaries, merge precedence with `options.labels`, and typing for custom keys.

## Evidence

- `evidence-0500-plugin-i18n-structure.mp4`
