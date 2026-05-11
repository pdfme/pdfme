# JSX (beta)

`@pdfme/jsx` lets you author pdfme templates with JSX layout primitives such as
`Document`, `Page`, `Stack`, `Row`, `Box`, `Text`, `Table`, `Header`, `Footer`, and `Absolute`.

It is an authoring layer only. The output is a normal pdfme `Template` plus `inputs`, so you can pass
the result to `generate`, `Designer`, `Form`, or `Viewer` with the usual plugins and fonts.

You can try the browser version in the [JSX playground](https://playground.pdfme.com/jsx). The
playground includes sample presets and can switch the preview between `Viewer` and `Form`.

## Installation

```bash
npm install @pdfme/jsx
```

If you write JSX in TypeScript, configure the JSX runtime:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@pdfme/jsx"
  }
}
```

## Basic Usage

```tsx
import { generate } from '@pdfme/generator';
import { text, table } from '@pdfme/schemas';
import { Document, Page, Stack, Text, Table, renderToTemplate } from '@pdfme/jsx';

const { template, inputs } = await renderToTemplate(
  <Document size="A4" margin={{ x: 16, y: 18 }}>
    <Page>
      <Stack gap={6}>
        <Text size={24}>
          Invoice
        </Text>
        <Text color="#64748b">
          Generated from JSX, rendered by pdfme.
        </Text>
        <Table
          head={['Item', 'Qty', 'Price']}
          rows={[
            ['Design', 1, '$800'],
            ['Automation', 2, '$1,200'],
          ]}
        />
      </Stack>
    </Page>
  </Document>,
);

const pdf = await generate({
  template,
  inputs,
  plugins: { text, table },
});
```

## Layout Primitives

- `Document` is the root component for shared page settings and repeated static content.
- `Page` creates a page in the generated template. Multiple `Page` nodes become multiple entries in
  `template.schemas`. If `Page` is inside `Document`, it inherits `size`, `orientation`, `margin`,
  and `font` from `Document` unless those props are specified on the `Page`.
- `Document` props are defaults, not deep-merged style objects. If a `Page` specifies `margin`,
  `size`, `orientation`, or `font`, that `Page` value replaces the `Document` value for that prop.
  The generated blank `basePdf.padding` comes from the resolved margin of the first rendered page.
- `Stack` lays children vertically. `Row` lays children horizontally.
- `Box` adds padding, background, and border around nested content.
- `Spacer` reserves empty layout space.
- `Header` and `Footer` render repeated static schemas in the top and bottom margin areas of a blank
  base PDF. `Static` is the lower-level full-page repeated overlay.
- `Absolute` is an escape hatch for badges, watermarks, and small overlays. It does not affect flow.

The layout API intentionally borrows useful ideas from Flexbox without trying to be CSS-compatible.
Use `gap`, `margin`, `alignItems`, `justifyContent`, and `flex` / `flexGrow` for compact templates.

`Text`, `MultiVariableText`, `List`, and `Table` can usually omit `height`. JSX measures their initial
content while rendering and advances the surrounding `Stack`, `Row`, or `Box`. Use explicit `height`
when you want a fixed field, a fixed visual area, or predictable form input box. A `Box` without
`height` grows around its children during JSX rendering.

## Schema Components

`@pdfme/jsx` currently includes the main static and form-oriented schemas:

- `Text`
- `MultiVariableText`
- `Image`
- `Svg`
- `Rectangle`
- `Ellipse`
- `Line`
- `List`
- `Table`

If a component has a `name`, it becomes input-backed by default. If it has no `name`, it is rendered as
read-only content. This mirrors the pdfme template data model.

Because the output is a normal pdfme template, Designer edits apply to the generated `Template`. JSX is
the seed authoring surface; it is not a lossless source format after the template has been edited in
Designer.

`Table` uses `columnWeights` for relative column sizing. The values are normalized to pdfme
`headWidthPercentages`, so `columnWeights={[30, 70]}` means a 30/70 split, not `30mm` / `70mm`.
Missing or invalid weights default to `1`, so pass one weight per column when the exact ratio
matters. Earlier beta builds used `widths`; use `columnWeights` going forward.

## JSX Playground Beta

The playground accepts a function body, not a full module:

```tsx
return (
  <Page>
    <Text>Hello from JSX</Text>
  </Page>
);
```

For now, the playground injects pdfme JSX components into the evaluation scope. It runs rendering in a
Web Worker, blocks common browser globals, and does not support `import` or `export` statements yet.
This keeps the browser sandbox and module resolution small while the API is still beta.

For repeated content, prefer `Document` with document-level `Header` / `Footer`:

```tsx
return (
  <Document size="A4" margin={{ x: 16, y: 18 }}>
    <Header>
      <Text>Report</Text>
    </Header>
    <Footer>
      <Text align="right">
        {'Page {currentPage} of {totalPages}'}
      </Text>
    </Footer>
    <Page>
      <Text>Body</Text>
    </Page>
  </Document>
);
```

To migrate from the earlier beta static API, move `Header` / `Footer` / `Static` out of `Page` and
place them directly inside `Document`.

`Header` and `Footer` are margin-aware. Their coordinate origin is the page margin area, so they are
usually the right choice for titles, page numbers, and repeated document chrome. `Static` uses the full
page coordinate system and is intended for advanced overlays such as watermarks, crop marks, or stamps.

## Current Limitations

- `@pdfme/jsx` is still beta. Component names and layout details may still be refined.
- The playground is intended for trusted examples and experimentation, not for executing untrusted code.
- It does not parse CSS and is not a React renderer. Components produce pdfme schema objects.
- Full Flexbox features such as `flexWrap`, `flexShrink`, media queries, and CSS percentages are not
  implemented.
- The output is a `Template + inputs` pair. Runtime rendering still depends on the usual pdfme plugins,
  fonts, and generator/viewer options.
- `Header`, `Footer`, and `Static` are supported only as direct children of `Document`. They generate
  blank `basePdf.staticSchema` and cannot be used with a custom PDF `basePdf`.
- If a form input later expands at runtime, a parent `Box` rectangle is not dynamically resized yet.
  Dynamic parent/child container reflow is a future layout feature.
