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
