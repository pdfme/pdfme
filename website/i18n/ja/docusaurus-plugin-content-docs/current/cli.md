# CLI (beta)

`@pdfme/cli` は、JSON-first な pdfme workflow のためのコマンドラインインターフェースです。

主な用途:

- custom Node script を書かずに template と inputs から PDF を生成する
- `generate` の前に template や unified job を検証する
- CI や agent 実行前に runtime、font、`basePdf`、出力先の問題を診断する
- 既存 PDF を画像やページサイズ情報に変換する
- official example を template または unified job として取り出す

## インストール

Node.js 20 以降が必要です。

```bash
npm install -D @pdfme/cli
```

`npx` から直接実行することもできます。

```bash
npx @pdfme/cli generate --help
```

## コマンド一覧

- `pdfme generate`
  - unified job または `--template` + `--inputs` から PDF を生成する
  - 必要に応じてページ画像も出力する
  - 画像にグリッド線と schema 境界を重ねられる
- `pdfme validate`
  - 生成前に template または unified job を検証する
  - `--json` で machine-readable な inspection を返す
- `pdfme doctor`
  - 環境、input、font、`basePdf`、cache、output path を診断する
- `pdfme pdf2img`
  - 既存 PDF をページ画像へ変換する
- `pdfme pdf2size`
  - PDF のページサイズをミリメートル単位で確認する

## `pdfme generate`

`generate` は次の 2 形式を受け付けます。

- unified job file
- template file + separate inputs file

使用例:

```bash
# Unified job file: { template, inputs, options? }
pdfme generate job.json -o out.pdf

# Template + inputs を別ファイルで指定
pdfme generate -t template.json -i inputs.json -o out.pdf

# ページ画像も出力
pdfme generate job.json -o out.pdf --image

# 画像にグリッド線と schema 境界を重ねる
pdfme generate job.json -o out.pdf --grid

# CLI から basePdf を上書き
pdfme generate -t template.json -i inputs.json --basePdf invoice.pdf -o out.pdf

# CI / agent 向けの構造化出力
pdfme generate job.json -o out.pdf --image --json
```

主なオプション:

| オプション | デフォルト | 説明 |
| --- | --- | --- |
| `[file]` | - | `{ template, inputs, options? }` を含む unified job file |
| `-t, --template` | - | Template JSON file |
| `-i, --inputs` | - | Input JSON file |
| `-o, --output` | `output.pdf` | 出力 PDF パス |
| `--force` | `false` | 暗黙の `output.pdf` 上書きを許可する |
| `--image` | `false` | 生成した各ページの画像も書き出す |
| `--imageFormat` | `png` | `png` または `jpeg` |
| `--scale` | `1` | 画像レンダリングの scale |
| `--grid` | `false` | 生成画像にグリッド線と schema 境界を描画する |
| `--gridSize` | `10` | グリッド間隔(mm) |
| `--font` | - | `Name=path.ttf` 形式のローカル custom font。複数指定時はカンマ区切り |
| `--basePdf` | - | `template.basePdf` を PDF file path で上書きする |
| `--noAutoFont` | `false` | CJK 文字向けの `NotoSansJP` 自動解決を無効化する |
| `-v, --verbose` | `false` | 入出力や描画条件を stderr に出す |
| `--json` | `false` | stdout に JSON のみを出す |

注意点:

- `output.pdf` が既に存在し、かつ `-o` や `--force` を明示していない場合、`generate` は上書きを拒否します。
- `--grid` は `--image` を付けていなくても画像出力を有効にします。
- 生成画像は出力 PDF と同じディレクトリに `<output-base>-1.png`, `<output-base>-2.png` の形式で保存されます。`--imageFormat jpeg` の場合は `.jpg` になります。
- `--font` のローカルパスは CLI 実行時の current working directory 基準で解決されます。
- unified job の `options.font.<name>.data` にあるローカルパスは、job file または template file のあるディレクトリ基準で解決されます。
- CJK が含まれ、かつ明示的な font source がない場合、CLI は `--noAutoFont` が付いていない限り `NotoSansJP` を自動解決して cache します。

Unified job の例:

```json
{
  "template": {
    "basePdf": {
      "width": 210,
      "height": 297,
      "padding": [20, 20, 20, 20]
    },
    "schemas": [
      [
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
  ],
  "options": {
    "font": {
      "NotoSansJP": {
        "data": "https://fonts.gstatic.com/...",
        "fallback": false,
        "subset": true
      }
    }
  }
}
```

`template.basePdf` には `"./invoice.pdf"` のような相対 PDF path も指定できます。必要なら `--basePdf` で実行時に上書きできます。

`--json` 指定時の stdout は JSON のみになります。

```json
{
  "ok": true,
  "command": "generate",
  "mode": "job",
  "templatePageCount": 1,
  "inputCount": 1,
  "pageCount": 1,
  "outputPath": "out.pdf",
  "outputBytes": 12345,
  "imagePaths": ["out-1.png"]
}
```

## `pdfme validate`

`validate` は template file または unified job file を、生成前に検証します。

使用例:

```bash
pdfme validate template.json
pdfme validate job.json --json
cat job.json | pdfme validate - --json
pdfme validate template.json --strict
pdfme validate template.json -v --json
```

主な検証内容:

- pdfme の template validation による構造チェック
- 未知の schema type
- 同一ページ内の重複 field name
- ページをまたいだ同名 field の warning
- ページ境界外にはみ出す field position の warning
- template top-level の未知フィールドに対する warning
- unified job が `generate` に渡せる形かどうか
- unified job に対する field-level input contract check

便利なフラグ:

- `--strict`
  - warning も failure 扱いにする
- `--json`
  - `valid`, `errors`, `warnings`, `inspection`, `inputHints` を返す
- `-v, --verbose`
  - 入力 source、mode、件数、サマリを stderr に出す

`inputHints` により、`generate` 実行前に writable field が何を期待しているかを判定できます。現行 CLI は次の入力種別を区別します。

- plain string
- `contentKind` 付きの asset-like string
- human-readable な `rule` を持つ barcode string
- `string[][]` の table payload
- `format` metadata を持つ canonical date/time string
- `select` / `checkbox` / `radioGroup` の constrained enum string
- `multiVariableText` 向けの JSON string object

## `pdfme doctor`

`doctor` は実行環境や特定の template/job を、生成前に診断します。

使用例:

```bash
# 環境診断
pdfme doctor

# Template または job の診断
pdfme doctor job.json --json

# stdin から診断
cat job.json | pdfme doctor - --json

# Font に絞った診断
pdfme doctor fonts job.json --json

# 自動 CJK font 解決を無効化した条件で診断
pdfme doctor job.json --noAutoFont --json

# generate と同じ output path / image output 条件で事前診断
pdfme doctor job.json -o artifacts/out.pdf --image --imageFormat jpeg --json
```

## `pdfme pdf2img`

既存 PDF をページ画像に変換します。

使用例:

```bash
pdfme pdf2img invoice.pdf
pdfme pdf2img invoice.pdf --grid --gridSize 10
pdfme pdf2img invoice.pdf --pages 1-3
pdfme pdf2img invoice.pdf -o ./images --imageFormat jpeg
pdfme pdf2img invoice.pdf -o ./images --json
```

挙動:

- `-o, --output` はファイル名ではなくディレクトリを受け取ります
- 出力ファイル名は `<input-base>-<page>.png` または `.jpg` です
- `--pages` は `1-3` や `1,3,5` のような形式を受け取ります
- `--grid` はレンダリングされたページ画像にミリメートルグリッドを描画します
- `--json` では `pageCount`, `selectedPageCount`, `outputPaths`, 各ページの width/height を返します

## `pdfme pdf2size`

PDF のページサイズをミリメートル単位で確認します。

使用例:

```bash
pdfme pdf2size invoice.pdf
pdfme pdf2size invoice.pdf --json
```

標準サイズを検出できる場合、人間向け出力には `A4 portrait` のようなラベルも付きます。JSON 出力の例:

```json
{
  "ok": true,
  "command": "pdf2size",
  "pageCount": 1,
  "pages": [
    { "pageNumber": 1, "width": 210, "height": 297 }
  ]
}
```

## Font Contract

CLI は font を「明示的な source contract」として扱います。

サポートされる explicit font source:

- `--font Name=./path.ttf` による local `.ttf` file
- unified job `options.font.<name>.data` にある local `.ttf` file
- public な direct `http(s)` font asset URL
- `.ttf` data URI
- programmatic use における inline bytes

現行ルール:

- 明示的にサポートする custom font format は `.ttf` のみ
- `.otf` と `.ttc` は reject される
- `fonts.googleapis.com/css*` の stylesheet URL は reject される
- unsafe/private/loopback な `http(s)` URL は reject される
- explicit remote font fetch は 15 秒 timeout、32 MiB size limit で解決される
- remote font failure は `EFONT` で返る

CJK 向けの自動 `NotoSansJP` 解決は、明示的な font source がないときだけ使われます。CJK を含み、font が cache されておらず、さらに自動解決が無効または不可能な場合は `generate` は `EFONT` で失敗します。

## Structured Output と Exit Code

`--json` を付けると:

- stdout は JSON のみになる
- 成功 payload は `ok: true`
- failure payload は `ok: false` と `error.code`, `error.message`, 場合によっては `error.details` を含む
- `-v, --verbose` の人間向け情報は引き続き stderr に出る

現行の exit code 区分:

| コード | 意味 |
| --- | --- |
| `0` | 成功 |
| `1` | argument / validation / unsupported input failure |
| `2` | runtime / font-resolution failure |
| `3` | file I/O failure |

## 典型的な使い方

unified job file をまず診断し、画像で確認してから PDF を作成します。

```bash
pdfme doctor job.json --json
pdfme generate job.json -o out.pdf --image --grid
```

既存 PDF を basePdf として使う overlay workflow:

```bash
pdfme pdf2img invoice.pdf --grid --gridSize 10
pdfme pdf2size invoice.pdf --json
pdfme doctor template.json -o out.pdf --image --json
pdfme generate -t template.json -i inputs.json -o out.pdf --image --grid
```
