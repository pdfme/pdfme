# Issue #637 - Support for a page break schema

Status: `partially_done`

## Rationale

- Dynamic layout/page splitting exists for built-in table, list, and expandable text schemas (`packages/schemas/src/dynamicLayout.ts`).
- There is no `pageBreak` schema type, plugin export, playground registration, prop panel, or generator branch.
- The current workaround remains layout-driven: tables/lists/text can push content to later pages, but authors cannot insert a semantic manual page-break marker as requested.

## Suggested action

Keep open and clarify the desired scope: a no-output `pageBreak` schema, a group/keep-with-next mechanism, or both. If implemented, it should integrate with `getDynamicTemplate` ordering and Designer insertion/selection behavior.

## Evidence

- `evidence-0637-page-break-schema.mp4`
