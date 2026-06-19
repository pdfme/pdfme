# コンバーター

`@pdfme/converter` は Node.js とブラウザの両方で使用できます。

その主な目的は、PDFを他の形式（画像など）に変換したり、様々なデータ形式（Markdownなど）をPDFに変換することです。

まだ開発中ですが、すでに以下の機能を使用することができます：

- **PDFを画像に変換**: [pdf2img](https://github.com/pdfme/pdfme/blob/main/packages/converter/src/pdf2img.ts)
- **各ページの幅と高さを取得**: [pdf2size](https://github.com/pdfme/pdfme/blob/main/packages/converter/src/pdf2size.ts)
- **画像をPDFに変換**: [img2pdf](https://github.com/pdfme/pdfme/blob/main/packages/converter/src/img2pdf.ts)
- **MarkdownからPDF**: `md2pdf`

計画されている変換機能には以下が含まれます：
- **PDFからMarkdown**: `pdf2md`

## インストール

```bash
npm install @pdfme/converter
```

Node.js で `pdf2img` を使うために追加の install は不要です。PDFium を `clawpdf` 経由で使用するため、Node.js で使う場合は Node.js 20 以降が必要です。

## 機能

### pdf2img
PDFページをPNG画像に変換します。

```ts
import { pdf2img } from '@pdfme/converter';

const pdf = new ArrayBuffer(...); // ソースPDF
const images = await pdf2img(pdf, {
  scale: 1,
  range: { start: 0, end: 1 },
});
```

### pdf2size
PDFの各ページの幅と高さを取得します。

```ts
import { pdf2size } from '@pdfme/converter';

const pdf = new ArrayBuffer(...); // ソースPDF
const sizes = await pdf2size(pdf, {
  scale: 1, // スケールファクター（デフォルト: 1）
});
// sizes: Array<{ width: number, height: number }>
```

### img2pdf
1つまたは複数の画像（JPEGまたはPNG）を1つのPDFファイルに変換します。

```ts
import { img2pdf } from '@pdfme/converter';

const image1 = new ArrayBuffer(...); // 1枚目の画像
const image2 = new ArrayBuffer(...); // 2枚目の画像
const pdf = await img2pdf([image1, image2], {
  scale: 1,
  size: { width: 210, height: 297 },
  margin: [10, 10, 10, 10],
});
```

### md2pdf (beta)
GitHub Flavored Markdown を pdfme の `Template` と `inputs` の組に変換します。

```ts
import { md2pdf } from '@pdfme/converter/md2pdf';

const { template, inputs } = await md2pdf('# Hello\n\nVisit [pdfme](https://pdfme.com).');
```

[md2pdf playground](https://playground.pdfme.com/md2pdf) で実際に試せます。いくつかの Markdown サンプル
プリセットも切り替えられます。

`md2pdf` は subpath export として公開されています。通常の `@pdfme/converter` import では Markdown parser の依存をブラウザ bundle に含めません。

PDFを生成するには、返された `template` と `inputs` を `@pdfme/generator` に渡し、Markdownで使われる schema plugin を登録してください。

```ts
import { md2pdf } from '@pdfme/converter/md2pdf';
import { generate } from '@pdfme/generator';
import { image, line, list, table, text } from '@pdfme/schemas';

const { template, inputs } = await md2pdf(`
# リリースノート

- Markdown が pdfme schemas に変換されます。
- 水平線は line schema になります。

---

| Feature | Status |
| --- | --- |
| Tables | Supported |
`);

const pdf = await generate({
  template,
  inputs,
  plugins: {
    Text: text,
    List: list,
    Table: table,
    Image: image,
    Line: line,
  },
});
```

#### 日本語とCJKテキスト
pdfme のデフォルトフォントは Roboto で、日本語/CJK glyph を含みません。日本語 Markdown を扱う場合は、変換時に CJK 対応の `fontName` を指定し、generator または UI options に同じフォントを渡してください。

```ts
import { readFile } from 'node:fs/promises';
import { md2pdf } from '@pdfme/converter/md2pdf';
import { generate } from '@pdfme/generator';
import { image, line, list, table, text } from '@pdfme/schemas';

const fontData = await readFile('./fonts/NotoSansJP-Regular.ttf');
const { template, inputs } = await md2pdf('# 日本語\n\nこれはPDF生成のテストです。', {
  style: { fontName: 'NotoSansJP' },
});

const pdf = await generate({
  template,
  inputs,
  plugins: { Text: text, List: list, Table: table, Image: image, Line: line },
  options: {
    font: {
      NotoSansJP: { data: fontData, fallback: true, subset: false },
    },
  },
});
```

`basePdf` を渡した場合、`md2pdf` は `page` options から blank PDF を作らず、その値をそのまま使います。これは pdfme template と同じ `BlankPdf` object なので、`staticSchema` も含められます。

#### 現在の制限
`md2pdf` は実用的な GFM block を扱えますが、GitHub Markdown renderer の完全互換ではありません。

- paragraph、heading、list、table、code block、blockquote、horizontal rule、link、PNG/JPEG data URI image に対応しています。
- pagination は変換後に pdfme dynamic layout が処理します。text、list、table はページ分割できますが、image の keep-together はまだ基本的な扱いです。
- table cell は plain text です。table cell 内の inline Markdown 装飾は取り除かれます。
- code block の language tag は parse されますが、まだ描画されません。
- blockquote は簡単な background、padding、left rule で表現され、nested block layout としては扱いません。
- remote Markdown image は現時点では link として出力されます。remote image の fetch と asset metadata は今後の対応です。
- PNG/JPEG data URI image は固定の初期高さで描画され、まだ aspect ratio を保持しません。
- list item 内の nested code block や blockquote など複雑な子要素は、list item text に単純化されます。

## エラー処理

無効なパラメータが提供された場合、すべての関数は説明的なエラーをスローします：

- 無効なPDF: `[@pdfme/converter] Invalid PDF`
- 空のPDF: `[@pdfme/converter] The PDF file is empty`
- 無効なページ範囲: `[@pdfme/converter] Invalid page range`
- 空の画像配列: `[@pdfme/converter] Input must be a non-empty array of image buffers`
- 無効な画像: `[@pdfme/converter] Failed to process image`

## 型定義

```ts
import type { BlankPdf, PageOrientation, PageSize } from '@pdfme/common';

interface PageRange {
  start?: number;
  end?: number;
}

interface Pdf2ImgOptions {
  scale?: number;
  range?: PageRange;
}

interface Pdf2SizeOptions {
  scale?: number;
}

interface Img2PdfOptions {
  scale?: number;
  size?: { height: number, width: number }; // ミリメートル単位
  margin?: [number, number, number, number]; // ミリメートル単位 [上, 右, 下, 左]
}

type BoxSides = { top?: number, right?: number, bottom?: number, left?: number, x?: number, y?: number };
type MarkdownMargin = number | [number, number, number, number] | BoxSides;

interface Md2PdfOptions {
  page?: {
    size?: PageSize;
    orientation?: PageOrientation;
    margin?: MarkdownMargin;
  };
  basePdf?: BlankPdf;
  style?: {
    fontName?: string;
    fontSize?: number;
    lineHeight?: number;
    fontColor?: string;
    headingScale?: Partial<Record<1 | 2 | 3 | 4 | 5 | 6, number>>;
  };
}
```

## お問い合わせ

`@pdfme/converter`に関するご質問やご提案がありましたら、以下までご連絡ください：

- **Discord**: [https://discord.gg/xWPTJbmgNV](https://discord.gg/xWPTJbmgNV)
- **GitHub Issues**: [https://github.com/pdfme/pdfme/issues](https://github.com/pdfme/pdfme/issues)
