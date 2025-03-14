# マニピュレーター

`@pdfme/manipulator`パッケージはPDFファイルを操作するための強力なユーティリティを提供します。Node.jsとブラウザ環境の両方で使用できます。

## インストール

```bash
npm install @pdfme/manipulator
```

## 機能

### merge（結合）
複数のPDFファイルを1つのPDFに結合します。

```ts
import { merge } from '@pdfme/manipulator';

const pdf1 = new ArrayBuffer(...); // 1つ目のPDF
const pdf2 = new ArrayBuffer(...); // 2つ目のPDF
const merged = await merge([pdf1, pdf2]);
```

### split（分割）
PDFをページ範囲に基づいて複数のPDFに分割します。

```ts
import { split } from '@pdfme/manipulator';

const pdf = new ArrayBuffer(...); // ソースPDF
const splits = await split(pdf, [
  { start: 0, end: 1 }, // 1-2ページ
  { start: 2, end: 4 }, // 3-5ページ
]);
```

### rotate（回転）
PDFの指定されたページを回転させます。

```ts
import { rotate } from '@pdfme/manipulator';

const pdf = new ArrayBuffer(...); // ソースPDF
const result = await rotate(pdf, 90); // すべてのページを90度回転
// または特定のページを回転：
const result2 = await rotate(pdf, 90, [0, 2]); // 1ページ目と3ページ目を回転
```

### insert（挿入）
指定された位置にPDFページを挿入します。

```ts
import { insert } from '@pdfme/manipulator';

const basePdf = new ArrayBuffer(...); // ベースPDF
const insertPdf = new ArrayBuffer(...); // 挿入するPDF
const result = await insert(basePdf, [
  { pdf: insertPdf, position: 1 } // 1ページ目の後に挿入
]);
```

### remove（削除）
PDFから指定されたページを削除します。

```ts
import { remove } from '@pdfme/manipulator';

const pdf = new ArrayBuffer(...); // ソースPDF
const result = await remove(pdf, [1, 3]); // 2ページ目と4ページ目を削除
```

### move（移動）
PDFの中で1つのページを別の位置に移動します。

```ts
import { move } from '@pdfme/manipulator';

const pdf = new ArrayBuffer(...); // ソースPDF
const result = await move(pdf, { from: 0, to: 2 }); // 1ページ目を3番目の位置に移動
```

### organize（整理）
複数のPDF操作を順番に実行します。

```ts
import { organize } from '@pdfme/manipulator';

const pdf = new ArrayBuffer(...); // ソースPDF
const insertPdf = new ArrayBuffer(...); // 挿入するPDF
const result = await organize(pdf, [
  { type: 'remove', data: { position: 1 } },
  { type: 'insert', data: { pdf: insertPdf, position: 0 } },
  { type: 'rotate', data: { position: 0, degrees: 90 } },
]);
```

## エラー処理

無効なパラメータが提供された場合、すべての関数は説明的なエラーをスローします：

- 無効なページ番号: `[@pdfme/manipulator] Invalid page number`
- 無効な回転角度: `[@pdfme/manipulator] Rotation degrees must be a multiple of 90`
- 無効な位置: `[@pdfme/manipulator] Invalid position`
- 空の入力: `[@pdfme/manipulator] At least one PDF is required`

## 型定義

```ts
type PDFInput = ArrayBuffer;

interface PageRange {
  start?: number;
  end?: number;
}

interface InsertOperation {
  pdf: PDFInput;
  position: number;
}

type OrganizeAction =
  | { type: 'remove'; data: { position: number } }
  | { type: 'insert'; data: { pdf: PDFInput; position: number } }
  | { type: 'replace'; data: { pdf: PDFInput; position: number } }
  | { type: 'rotate'; data: { position: number; degrees: 0 | 90 | 180 | 270 | 360 } }
  | { type: 'move'; data: { from: number; to: number } };
```

## お問い合わせ

`@pdfme/manipulator`に関するご質問やご提案がありましたら、以下までご連絡ください：

- **Discord**: [https://discord.gg/xWPTJbmgNV](https://discord.gg/xWPTJbmgNV)
- **GitHub Issues**: [https://github.com/pdfme/pdfme/issues](https://github.com/pdfme/pdfme/issues)
