# Designing PDF templates with structure

When a document grows, absolute coordinates become hard to maintain. A structured authoring layer lets you describe intent first and turn it into pdfme schemas later.

## Why structure helps

1. Repeated patterns can be expressed once.
2. Rows and stacks make spacing easier to review.
3. The output still stays compatible with normal pdfme tooling.

> The goal is not to turn pdfme into a browser layout engine. The goal is to make common document authoring tasks less fragile.

## Example checklist

- Start with semantic sections.
- Use tables for grid data.
- Use static headers and footers for repeated page content.
- Keep custom positioning as an escape hatch.

```tsx
return (
  <Page>
    <Stack gap={6}>
      <Text>Structured authoring</Text>
    </Stack>
  </Page>
);
```
