# md2pdf playground

Markdown becomes a pdfme Template. Japanese text also works when you choose a CJK-capable font.

## Blocks

- Paragraph
- **Bold**, *italic*, ~~strike~~, `inline code`
- [pdfme](https://pdfme.com)

---

> Blockquotes use a left rule, background, and padding.

```ts
const result = await md2pdf(markdown);
const pdf = await generate(result);
```

| Feature | Status |
| --- | --- |
| Table grid | Supported |
| Remote image | Link fallback |
