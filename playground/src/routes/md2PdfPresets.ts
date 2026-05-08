export type Md2PdfPreset = {
  id: string;
  label: string;
  description: string;
  markdown: string;
};

export const md2PdfPresets: Md2PdfPreset[] = [
  {
    id: 'overview',
    label: 'Overview',
    description:
      'Basic GFM blocks, inline formatting, horizontal rule, blockquote, code, and table.',
    markdown: `# md2pdf playground

Markdown becomes a pdfme Template. Japanese text also works when you choose a CJK-capable font.

## Blocks

- Paragraph
- **Bold**, *italic*, ~~strike~~, \`inline code\`
- [pdfme](https://pdfme.com)

---

> Blockquotes use a left rule, background, and padding.

\`\`\`ts
const result = await md2pdf(markdown);
const pdf = await generate(result);
\`\`\`

| Feature | Status |
| --- | --- |
| Table grid | Supported |
| Remote image | Link fallback |
`,
  },
  {
    id: 'release-notes',
    label: 'Release notes',
    description: 'A product-note style document with task list syntax and tables.',
    markdown: `# Release Notes

This preset is useful for checking how md2pdf handles headings, task lists, tables, and longer paragraphs.

## Highlights

- [x] JSX playground with Monaco editor
- [x] md2pdf live preview
- [ ] Remote image fetching
- [ ] Rich inline content inside table cells

## Changes

| Area | Change | Notes |
| --- | --- | --- |
| Playground | Added presets | Selector is intentionally simple |
| JSX | Viewer and Form preview | Input-backed fields can be edited |
| Markdown | Partial GFM support | Complex nested blocks are simplified |

## Notes

Longer documents are converted into regular pdfme schemas. Paragraphs use expandable text schemas, while tables and images still need keep-together improvements.
`,
  },
  {
    id: 'article',
    label: 'Article',
    description: 'A longer article-like sample for pagination and text wrapping checks.',
    markdown: `# Designing PDF templates with structure

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

\`\`\`tsx
return (
  <Page>
    <Stack gap={6}>
      <Text>Structured authoring</Text>
    </Stack>
  </Page>
);
\`\`\`
`,
  },
  {
    id: 'japanese-report',
    label: 'Japanese report',
    description: 'A Japanese Markdown sample for CJK font and table rendering checks.',
    markdown: `# 日本語レポート

これは md2pdf で日本語を含む Markdown を PDF に変換するサンプルです。フォントには NotoSansJP を指定しています。

## 概要

- Markdown から pdfme Template を生成します。
- Viewer でプレビューし、PDF も生成できます。
- GFM の完全互換ではなく、PDF として扱いやすい表現を優先します。

> 引用ブロックは左線と余白を持つテキストボックスとして表現されます。

| 項目 | 状態 |
| --- | --- |
| 日本語テキスト | 対応 |
| テーブル | 基本対応 |
| リモート画像 | 現在はリンク fallback |

\`\`\`ts
const { template, inputs } = await md2pdf(markdown, {
  style: { fontName: 'NotoSansJP' },
});
\`\`\`
`,
  },
];

export const initialMarkdown = md2PdfPresets[0]?.markdown ?? '';
