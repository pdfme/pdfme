# Migration Guide v6

このドキュメントは、次のメジャーリリースで予定している破壊的変更と、アプリケーション、サンプル、ローカル開発環境で必要になる最小限の移行作業をまとめたものです。

## 破壊的変更

| 変更                        | 影響を受けるユーザー                                                         | 必要な対応                               |
| --------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------- |
| `ESM-only` パッケージ       | `require('@pdfme/...')` を使っているユーザー                                 | `import` / `export` 構文へ移行           |
| `Node 20+` 最低要件         | Node 16 / 18 ユーザー                                                        | Node 20 LTS 以降へ更新                   |
| UI パッケージで `React 18+` | React 16 / 17 で `@pdfme/ui` を使っているユーザー                            | `react` / `react-dom` を 18+ へ更新      |
| 内部 `dist/*` import 廃止   | `@pdfme/*/dist/...` や `@pdfme/*/cjs/src/...` を直接 import しているユーザー | package root の public export のみを使用 |

## サポートポリシー

| 項目                   | 方針       |
| ---------------------- | ---------- |
| ランタイム             | Node 20+   |
| ブラウザ向けターゲット | `es2020`   |
| UI の peer baseline    | React 18+  |
| モジュール形式         | `ESM-only` |

## 移行方法

### CommonJS から ESM へ

変更前:

```js
const { BLANK_PDF } = require('@pdfme/common');
const { generate } = require('@pdfme/generator');
```

変更後:

```ts
import { BLANK_PDF } from '@pdfme/common';
import { generate } from '@pdfme/generator';
```

Node.js で ESM からファイルを書き出す場合は、`__dirname` の代わりに `fileURLToPath(import.meta.url)` を使います。

```ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

### パッケージ内部パスの廃止

変更前:

```ts
import { generate } from '@pdfme/generator/cjs/src/index.js';
import { pdf2img } from '@pdfme/converter/cjs/src/index.node.js';
```

変更後:

```ts
import { generate } from '@pdfme/generator';
import { pdf2img } from '@pdfme/converter';
```

### React 18+

UI 利用側は React 18 以降へ更新してください。

```bash
npm install react@^18 react-dom@^18
```

### Node 20+

次のメジャーリリースを採用する前に、ローカル開発環境と CI を Node 20 LTS 以降へ更新してください。

## メンテナー向けチェックリスト

- リリース前に GitHub Discussions または Issue で方針を告知する。
- examples、docs、playground を public export のみ使う形に更新する。
- Node 向けサンプルから `require()` を段階的に除去する。
- ドキュメントに内部 `dist/*` import が残っていないことを確認する。
