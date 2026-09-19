# Issue #671 - Iterable group

Status: `still_missing`

## Rationale

- Tables provide iterable rows, and dynamic layout supports table/list/text, but there is no generic group/section schema that repeats arbitrary child schemas from an array.
- Code search found no iterable group schema, group frame UI, repeated child layout engine, or schema-relative coordinate system.
- The JSX package has layout helpers, but it renders templates ahead of time and does not add a runtime Designer/generator iterable group schema.

## Suggested action

Keep open as a larger feature request. It likely needs a design proposal covering child schema ownership, data binding, repeated block layout, page splitting, Designer selection/move semantics, and import/export format.

## Evidence

- `evidence-0671-iterable-group.mp4`
