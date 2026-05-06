# @pdfme/jsx

Small JSX authoring layer for creating pdfme templates from stacking layout primitives.

```tsx
/** @jsxImportSource @pdfme/jsx */
import { MultiVariableText, Page, Stack, Text, renderToTemplate } from '@pdfme/jsx';

const { template, inputs } = await renderToTemplate(
  <Page margin={{ x: 12, y: 16 }}>
    <Stack gap={4}>
      <Text size={18}>Invoice</Text>
      <Text name="customerName">Alice</Text>
      <MultiVariableText
        name="message"
        text="Hello **{name}**, status: `{status}`"
        values={{ name: 'Alice **literal**', status: 'draft' }}
        textFormat="inline-markdown"
      />
    </Stack>
  </Page>,
);
```

This package emits regular pdfme `Template` and `inputs` values. It does not depend on React;
it provides its own `jsx-runtime` and `jsx-dev-runtime`.
`renderToTemplate` is async because automatic text height measurement may need font data.

## MVP constraints

- `Text` and `MultiVariableText` heights are measured with pdfme's text/rich text wrapping helpers
  when `height` is omitted. Pass an explicit `height` when you need a fixed field box.
- `Text textFormat="inline-markdown"` is read-only only. Editable `Text` values use plain content.
- `MultiVariableText` uses `text` or children as the template string and stores `values` as the
  JSON input. Variable names are inferred from `{name}` placeholders and can also be passed with
  `variables`.
- `Image` uses `src` as its initial content and is intended to be self-closing.
- `Svg` uses `svg` or children as its initial content.
- With `name`, `Image` and `Svg` become input-backed schemas; without `name`, they are read-only
  content.
- `Rectangle`, `Ellipse`, and `Line` are static visual schemas for backgrounds, dividers, and simple
  shapes.
- `Static`, `Header`, and `Footer` can be used as direct children of the first `Page` to render
  read-only header/footer style content into blank `basePdf.staticSchema`. Their children use page
  coordinates, not page margin coordinates, and custom `basePdf` is not supported.
- `Header` is a shorthand for `<Static placement="top">`; `Footer` is a shorthand for
  `<Static placement="bottom">`.

```tsx
<Header>
  <Text height={8}>Header</Text>
</Header>
<Footer>
  <Text height={8}>Footer</Text>
</Footer>
```

- Multiple `Static` blocks with the same placement are concatenated in declaration order. Top blocks
  start at the top of the page; bottom blocks are stacked together in declaration order and anchored
  to the page bottom, so the last bottom block sits at the page edge. If top and bottom static
  content together exceed the page height, they may overlap.
- Static content currently accepts read-only `Stack`, `Row`, `Box`, `Spacer`, `Text`, `Image`, `Svg`,
  `Rectangle`, `Ellipse`, and `Line` content. `MultiVariableText`, `List`, `Table`, input-backed
  schemas, and `PageBreak` are rejected.
- `Absolute` can be used inside `Page`, top `Static`, or `Box` as a small manual placement escape
  hatch. It uses the parent layout frame as its coordinate origin and does not advance the
  surrounding stack/row flow. When `width` or `height` is omitted, it uses the remaining parent
  frame size from `x` / `y`. Direct `Stack` / `Row` support is intentionally left for later; wrap
  with an explicit-size `Box` when you need a local manual-placement frame inside flow content.

```tsx
<Page margin={12}>
  <Text height={8}>Body starts here</Text>
  <Absolute x={120} y={0} width={60}>
    <Text height={6}>Top-right note</Text>
  </Absolute>
</Page>
```

- Layout children can use `margin`. `Stack` and `Row` support `alignItems` for simple cross-axis
  alignment without trying to implement full CSS/Flexbox.
- `Stack` and `Row` support `justifyContent="start" | "center" | "end" | "space-between"` for
  main-axis spacing. `Stack` uses this most predictably with an explicit `height`; `Row` uses it most
  predictably with an explicit `width`.
- `Stack` defaults to `alignItems="stretch"` to preserve full-width stacking. Use an explicit child
  `width` when you want `alignItems="center"` or `"end"` to visibly move that child.
- `Row` defaults to `alignItems="start"` and intentionally does not support cross-axis stretch yet.
- Row children can use `flexGrow` or `flex` as a grow weight. If `width` is also set, it is used as
  the basis before remaining width is distributed.
  `flex` is only a short alias for `flexGrow`, not the CSS `flex` shorthand.

```tsx
<Row width={120}>
  <Text width={20} flex={1}>A</Text>
  <Text width={20} flex={3}>B</Text>
</Row>
// A width: 40, B width: 80
```

- `flexGrow={0}` without `width` produces a zero-width Row child.
- `PageBreak` is supported only along a `Page` / `Stack` / `Box` layout path. It is rejected inside
  `Row`, leaf schemas, `List`, and `Table`.
- All `Page` nodes in one `renderToTemplate` call must use the same page size, orientation, and
  margin because a pdfme blank `basePdf` has one shared size and padding.
- `Table widths` are percentages passed to pdfme `headWidthPercentages`, for example
  `widths={[70, 30]}`.
