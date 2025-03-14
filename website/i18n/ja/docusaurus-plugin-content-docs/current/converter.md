# コンバーター

`@pdfme/converter` は Node.js とブラウザの両方で使用できます。

その主な目的は、PDFを他の形式（画像など）に変換したり、様々なデータ形式（Markdownなど）をPDFに変換することです。

まだ開発中ですが、すでに以下の機能を使用することができます：

- **PDFを画像に変換**: [pdf2img](https://github.com/pdfme/pdfme/blob/main/packages/converter/src/pdf2img.ts)
- **各ページの幅と高さを取得**: [pdf2size](https://github.com/pdfme/pdfme/blob/main/packages/converter/src/pdf2size.ts)
- **画像をPDFに変換**: [img2pdf](https://github.com/pdfme/pdfme/blob/main/packages/converter/src/img2pdf.ts)

計画されている変換機能には以下が含まれます：
- **MarkdownからPDF**: `md2pdf`
- **PDFからMarkdown**: `pdf2md`

## インストール

```bash
npm install @pdfme/converter
```

Node.jsでPDFを画像に変換する（`pdf2img`）場合は、[node-canvas](https://github.com/Automattic/node-canvas)（^2.11.2）が必要で、追加のステップが必要です：

```bash
npm install canvas@^2.11.2
```

## 機能

### pdf2img
PDFページを画像（JPEGまたはPNG形式）に変換します。

```ts
import { pdf2img } from '@pdfme/converter';

const pdf = new ArrayBuffer(...); // ソースPDF
const images = await pdf2img(pdf, {
  imageType: 'png',
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
  imageType: 'jpeg',
  size: { width: 210, height: 297 },
  margin: [10, 10, 10, 10],
});
```

## エラー処理

無効なパラメータが提供された場合、すべての関数は説明的なエラーをスローします：

- 無効なPDF: `[@pdfme/converter] Invalid PDF`
- 空のPDF: `[@pdfme/converter] The PDF file is empty`
- 無効なページ範囲: `[@pdfme/converter] Invalid page range`
- 空の画像配列: `[@pdfme/converter] Input must be a non-empty array of image buffers`
- 無効な画像: `[@pdfme/converter] Failed to process image`

## 型定義

```ts
type ImageType = 'jpeg' | 'png';

interface PageRange {
  start?: number;
  end?: number;
}

interface Pdf2ImgOptions {
  scale?: number;
  imageType?: ImageType;
  range?: PageRange;
}

interface Pdf2SizeOptions {
  scale?: number;
}

interface Img2PdfOptions {
  scale?: number;
  imageType?: ImageType;
  size?: { height: number, width: number }; // ミリメートル単位
  margin?: [number, number, number, number]; // ミリメートル単位 [上, 右, 下, 左]
}
```

## お問い合わせ

`@pdfme/converter`に関するご質問やご提案がありましたら、以下までご連絡ください：

- **Discord**: [https://discord.gg/xWPTJbmgNV](https://discord.gg/xWPTJbmgNV)
- **GitHub Issues**: [https://github.com/pdfme/pdfme/issues](https://github.com/pdfme/pdfme/issues)
