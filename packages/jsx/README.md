# @pdfme/jsx

Small JSX authoring layer for creating pdfme templates from stacking layout primitives.

```tsx
/** @jsxImportSource @pdfme/jsx */
import { Page, Stack, Text, renderToTemplate } from '@pdfme/jsx';

const { template, inputs } = renderToTemplate(
  <Page margin={{ x: 12, y: 16 }}>
    <Stack gap={4}>
      <Text size={18}>Invoice</Text>
      <Text name="customerName">Alice</Text>
    </Stack>
  </Page>,
);
```

This package emits regular pdfme `Template` and `inputs` values. It does not depend on React;
it provides its own `jsx-runtime` and `jsx-dev-runtime`.

## MVP constraints

- `Text` height is estimated from `fontSize * lineHeight` when `height` is omitted. Pass an
  explicit `height` when exact layout matters.
- `PageBreak` is supported only along a `Page` / `Stack` / `Box` layout path. It is rejected inside
  `Row`, `Text`, `List`, and `Table`.
- All `Page` nodes in one `renderToTemplate` call must use the same page size, orientation, and
  margin because a pdfme blank `basePdf` has one shared size and padding.
- `Table widths` are percentages passed to pdfme `headWidthPercentages`, for example
  `widths={[70, 30]}`.
