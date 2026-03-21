# @pdfme/cli

pdfme のコマンドラインツール。テンプレート作成・検証・PDF生成・画像変換を CLI で完結できる。

## 背景と設計思想

### なぜ CLI が必要か

pdfme は PDF テンプレートを JSON で定義し、プログラマティックに PDF を生成するライブラリ。従来の開発フローは「Designer UI でテンプレート作成 → コードから `generate()` 呼び出し → ブラウザで結果確認」というサイクルだった。

AI エージェント（Claude Code 等）を使った開発では、このフローに根本的な課題がある:

- **エージェントはブラウザの Designer UI を操作できない**
- **エージェントは PDF ファイルを直接読めない** — 画像に変換する必要がある
- **テンプレート JSON の構造エラーを、PDF 生成を試みるまで検出できない**

`@pdfme/cli` はこれらを解決し、**AI エージェントが自律的にテンプレート作成から結果検証まで完結できるフィードバックループ**を構築する。

```
JSON 編集 → pdfme generate --image → PNG 読み取り → 視覚確認 → 微調整
```

### 設計原則

- **AI エージェント特化**: `--json` フラグで構造化出力、`--help` に豊富な使用例、エラーメッセージに修正案を含める
- **日本語ユーザー対応**: CJK 文字を検出すると NotoSansJP を自動ダウンロード＆キャッシュ
- **既存 PDF からのテンプレート作成ワークフロー**: `pdf2img` → `pdf2size` → テンプレート作成 → `generate --image` の一連フローをサポート
- **npx でもローカルでも同等の体験**

### pdfme v5 ロードマップにおける位置づけ

pdfme v5 メジャーバージョンアップは 3 フェーズで構成される:

| フェーズ | 内容 | 状態 |
|---------|------|------|
| Phase 1 | Vite / Vitest / Oxlint 移行、ESM-only 化 | **完了** |
| Phase 2 | `@pdfme/cli` | **本パッケージ** |
| Phase 3 | Claude Code Skills (`/pdfme-verify` 等) | 未着手 |

Phase 1 で全パッケージのビルドを Vite library mode + Vitest に統一した。Phase 2 の CLI はその基盤の上に構築され、Phase 3 の Skills が CLI コマンドを活用する。

---

## インストール

```bash
# プロジェクトに追加
npm install -D @pdfme/cli

# または npx で直接実行
npx @pdfme/cli generate --help
```

**要件**: Node.js 20 以上

---

## コマンド一覧

| コマンド | 用途 |
|---------|------|
| [`generate`](#pdfme-generate) | テンプレート + 入力データ → PDF + 画像 |
| [`validate`](#pdfme-validate) | テンプレート JSON の構造検証 |
| [`pdf2img`](#pdfme-pdf2img) | 既存 PDF → 画像変換 (グリッド付き) |
| [`pdf2size`](#pdfme-pdf2size) | PDF のページサイズ取得 |
| [`examples`](#pdfme-examples) | 組み込みテンプレート資産の参照・出力 |

---

## pdfme generate

テンプレートと入力データから PDF を生成し、オプションで画像やグリッドオーバーレイも出力する。

### 使い方

```bash
# 分離形式: テンプレートと入力を別ファイルで指定
pdfme generate -t template.json -i inputs.json -o out.pdf

# 統合形式: { template, inputs } を含む 1 ファイル
pdfme generate job.json -o out.pdf --image

# 既存 PDF をベースに、フィールドを重ねて生成
pdfme generate -t template.json --basePdf invoice.pdf -i inputs.json --image --grid

# JSON 出力 (AI/スクリプト向け)
pdfme generate job.json -o out.pdf --image --json
```

### オプション

| フラグ | 型 | デフォルト | 説明 |
|--------|------|-----------|------|
| `[file]` | positional | - | 統合ファイル (`{ template, inputs }`) |
| `-t, --template` | string | - | テンプレート JSON ファイル |
| `-i, --inputs` | string | - | 入力データ JSON ファイル |
| `-o, --output` | string | `output.pdf` | 出力 PDF パス |
| `--image` | boolean | false | 各ページの PNG 画像も出力 |
| `--imageFormat` | string | `png` | 画像フォーマット (`png` / `jpeg`) |
| `--scale` | string | `1` | 画像レンダリングスケール |
| `--grid` | boolean | false | グリッド＋スキーマ境界を画像にオーバーレイ |
| `--gridSize` | string | `10` | グリッド間隔 (mm) |
| `--font` | string | - | カスタムフォント (カンマ区切りで複数可: `"A=a.ttf,B=b.ttf"`) |
| `--basePdf` | string | - | basePdf をファイルパスで上書き |
| `--noAutoFont` | boolean | false | CJK フォント自動ダウンロードを無効化 |
| `-v, --verbose` | boolean | false | 詳細出力 |
| `--json` | boolean | false | 構造化 JSON 出力 |

### 統合ファイル形式 (job.json)

```json
{
  "template": {
    "basePdf": { "width": 210, "height": 297, "padding": [20, 20, 20, 20] },
    "schemas": [
      [
        {
          "name": "title",
          "type": "text",
          "position": { "x": 20, "y": 20 },
          "width": 170,
          "height": 15,
          "fontSize": 24,
          "alignment": "center",
          "content": "Invoice",
          "readOnly": true
        },
        {
          "name": "customerName",
          "type": "text",
          "position": { "x": 20, "y": 50 },
          "width": 80,
          "height": 10
        }
      ]
    ]
  },
  "inputs": [
    { "customerName": "John Doe" }
  ]
}
```

テンプレート JSON 内の `basePdf` にはファイルパスも指定可能:

```json
{
  "basePdf": "./invoice.pdf",
  "schemas": [...]
}
```

### スキーマ型一覧

`text`, `multiVariableText`, `image`, `svg`, `table`, `qrcode`, `ean13`, `ean8`, `code39`, `code128`, `nw7`, `itf14`, `upca`, `upce`, `japanpost`, `gs1datamatrix`, `pdf417`, `line`, `rectangle`, `ellipse`, `date`, `dateTime`, `time`, `select`, `radioGroup`, `checkbox`

### --grid の出力

`--grid` を指定すると、画像に以下がオーバーレイされる:

- **グリッド線**: `--gridSize` mm 間隔のグレー線
- **スキーマ境界**: 色付き破線矩形 (型ごとに色分け)
- **ラベル**: 各フィールドの `名前 (型)` を矩形左上に表示

### CJK フォント自動ダウンロード

`--font` 未指定時、テンプレートや入力データに CJK 文字 (日本語、中国語、韓国語) が含まれていると、NotoSansJP を自動的にダウンロードしてキャッシュする:

- キャッシュ場所: `~/.pdfme/fonts/NotoSansJP-Regular.ttf`
- オフライン時は Roboto にフォールバック + 警告
- `--noAutoFont` で無効化

### 終了コード

| コード | 意味 |
|--------|------|
| 0 | 成功 |
| 1 | テンプレート/入力バリデーションエラー |
| 2 | 生成時エラー (フォント、レンダリング等) |
| 3 | ファイル I/O エラー |

---

## pdfme validate

テンプレート JSON の構造を検証する。`generate` の前に実行することで、エラーを早期発見できる。

### 使い方

```bash
pdfme validate template.json

# JSON 出力
pdfme validate template.json --json

# Warning もエラー扱いにする
pdfme validate template.json --strict
```

### 検証項目

| カテゴリ | チェック内容 | レベル |
|----------|------------|--------|
| 構造 | Zod スキーマバリデーション | ERROR |
| 型 | フィールドの type が存在するスキーマ型か | ERROR |
| 重複 | 同一ページ内のフィールド名重複 | ERROR |
| 重複 | 異なるページ間の同名フィールド | WARNING |
| 位置 | フィールドがページ境界外にはみ出し | WARNING |
| basePdf | BlankPdf の場合、width/height/padding が妥当か | ERROR |

型名が不正な場合、Levenshtein 距離に基づく修正候補を提示する:

```
✗ Error: Field "title" has unknown type "textbox". Did you mean: text? Available types: text, image, ...
```

---

## pdfme pdf2img

既存 PDF を画像に変換する。テンプレート作成時にレイアウトを確認したり、basePdf の内容を可視化するのに使う。

### 使い方

```bash
# 基本
pdfme pdf2img invoice.pdf

# グリッド付き (mm 座標ラベルも表示)
pdfme pdf2img invoice.pdf --grid --gridSize 10

# 特定ページのみ
pdfme pdf2img invoice.pdf --pages 1-2

# 出力先指定 + JSON (サイズ情報付き)
pdfme pdf2img invoice.pdf -o ./images/ --json
```

### `--json` 出力

```json
{
  "pages": [
    { "image": "invoice-1.png", "page": 1, "width": 210, "height": 297 }
  ]
}
```

---

## pdfme pdf2size

PDF のページサイズ (mm) を取得する。A4, Letter 等の標準サイズ名も自動判定。

```bash
$ pdfme pdf2size invoice.pdf
Page 1: 210 × 297 mm (A4 portrait)

$ pdfme pdf2size invoice.pdf --json
[{ "page": 1, "width": 210, "height": 297 }]
```

---

## pdfme examples

`https://playground.pdfme.com/template-assets/` で配信しているテンプレート資産を参照・出力する。AI エージェントがテンプレートを新規作成する際の構造参考として使える。

### 使い方

```bash
# テンプレート一覧
pdfme examples --list

# テンプレートを stdout に出力
pdfme examples invoice

# ファイルに出力
pdfme examples invoice -o template.json

# テンプレート + サンプル入力を統合形式で出力
pdfme examples invoice --withInputs -o job.json

# そのまま generate に渡せる
pdfme examples invoice --withInputs -o job.json && pdfme generate job.json --image
```

### 組み込みテンプレート

利用可能なテンプレートは `pdfme examples --list` で取得。

---

## 典型的ワークフロー

### 1. ゼロからテンプレートを作る (AI エージェント向け)

```bash
# 1. 既存テンプレートを参考に構造を把握
pdfme examples invoice --withInputs -o job.json

# 2. job.json を編集してテンプレートを作成

# 3. 生成して結果を画像で確認
pdfme generate job.json -o out.pdf --image

# 4. 画像を確認 → JSON を微調整 → 3 に戻る
```

### 2. 既存 PDF にフィールドを追加する

```bash
# 1. 既存 PDF のレイアウトを画像で確認
pdfme pdf2img invoice.pdf --grid --gridSize 10

# 2. ページサイズを確認
pdfme pdf2size invoice.pdf --json

# 3. テンプレート JSON を作成 (basePdf にファイルパスを指定)
cat > template.json << 'EOF'
{
  "basePdf": "./invoice.pdf",
  "schemas": [[
    {
      "name": "amount",
      "type": "text",
      "position": { "x": 120, "y": 200 },
      "width": 60, "height": 10,
      "fontSize": 14, "alignment": "right"
    }
  ]]
}
EOF

# 4. 入力データを作成
echo '[{ "amount": "¥1,234,567" }]' > inputs.json

# 5. 生成して結果をグリッド付き画像で確認
pdfme generate -t template.json -i inputs.json -o out.pdf --image --grid

# 6. 画像を確認 → テンプレートを微調整 → 5 に戻る
```

### 3. CI/CD でのテンプレート検証

```bash
# テンプレートの構造エラーをチェック (Warning もエラー扱い)
pdfme validate template.json --strict --json
```

---

## アーキテクチャ

### ディレクトリ構成

```
packages/cli/
├── src/
│   ├── index.ts              # エントリポイント + コマンドルーター
│   ├── commands/
│   │   ├── generate.ts       # PDF 生成 + 画像出力
│   │   ├── validate.ts       # テンプレート検証
│   │   ├── pdf2img.ts        # PDF → 画像変換
│   │   ├── pdf2size.ts       # ページサイズ取得
│   │   └── examples.ts       # テンプレート資産参照
│   ├── grid.ts               # グリッド / スキーマ境界オーバーレイ描画
│   ├── fonts.ts              # フォント読込 + CJK 自動 DL + キャッシュ
│   ├── cjk-detect.ts         # CJK 文字検出
│   └── utils.ts              # ファイル I/O, 入力形式判定, 用紙サイズ検出
├── __tests__/
├── package.json
├── vite.config.mts           # target: node20, ESM, shebang 付きビルド
├── tsconfig.json             # typecheck 用 (composite)
└── tsconfig.build.json       # declaration emit 用
```

### 依存関係

```
@pdfme/cli
├── @pdfme/common      # 型定義, フォント, バリデーション
├── @pdfme/schemas     # ビルトインスキーマプラグイン (text, image, table, ...)
├── @pdfme/generator   # PDF 生成エンジン
├── @pdfme/converter   # PDF ↔ 画像変換 (内部で @napi-rs/canvas 使用)
└── citty              # CLI パーサー (UnJS 製, ゼロ依存, サブコマンド対応)
```

### ビルド

```bash
npm run build -w packages/cli
# = vite build (→ dist/index.js, ESM, shebang 付き)
# + tsc -p tsconfig.build.json (→ dist/*.d.ts)
```

Vite で `target: node20`, 全依存を external にして単一 `dist/index.js` を出力。`@napi-rs/canvas` 等のネイティブモジュールはバンドルに含めない。

---

## 既知の制限事項

- **フォント複数指定**: citty が repeated string args を未サポートのため、カンマ区切り形式 (`--font "A=a.ttf,B=b.ttf"`) を使用
- **examples コマンド**: 一覧取得とテンプレート取得の両方でネットワーク接続が必要。取得先は `PDFME_EXAMPLES_BASE_URL` 環境変数で上書き可能
- **NotoSansJP の DL URL**: Google Fonts CDN の可変ウェイトフォント (~16MB) を使用。固定ウェイト版への切り替えでサイズ削減可能

## 今後の拡張 (v2 以降)

| 機能 | 優先度 | 備考 |
|------|--------|------|
| `pdfme list-schemas` | 高 | 利用可能スキーマ一覧 + プロパティ詳細 |
| `--diff` / `--maxDiff` | 中 | pixelmatch による画像差分比較 |
| `pdfme inspect` | 中 | テンプレート構造の可視化表示 |
| `pdfme dev` | 中 | Designer UI プレビューサーバー (ファイル変更監視) |
| `pdfme template create/add-field` | 低 | CLI 上でのテンプレート JSON 操作 |
| `--watch` | 低 | ファイル変更監視 + 自動再生成 |
