# 日本語レポート

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

```ts
const { template, inputs } = await md2pdf(markdown, {
  style: { fontName: 'NotoSansJP' },
});
```
