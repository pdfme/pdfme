# JSX / md2pdf ロードマップ

最終更新: 2026-05-05

## 目的

pdfme にリンク、stacking layout、Markdown/GFM 変換の土台を追加する。

短期的には、PDF 内リンクと `@pdfme/jsx` を整備する。中期的には、JSX で作った
layout/builder の考え方を `converter` package の `md2pdf` に応用し、Markdown AST
から通常の pdfme `Template` と `inputs` を生成できるようにする。

## 基本方針

- Markdown 文書全体を 1 つの巨大な schema に押し込まない。
- GFM parser の AST を layout tree に変換し、その後 `text`, `list`, `table`,
  `image`, `line`, `rectangle` など複数の pdfme schema に落とす。
- `@pdfme/jsx` は、その layout tree を手で書くための authoring DSL として扱う。
  `md2pdf` は Markdown AST から同じ方向の layout tree を作る別 frontend として扱う。
- `@pdfme/jsx` は generator の必須依存にはしない。出力は通常の pdfme `Template`
  と `inputs` にする。
- AI がテンプレートを生成する時も、絶対座標 JSON を直接作るより、`Stack`, `Row`,
  `Box`, `Text`, `List`, `Table` などの意味構造を作ってから pdfme template に変換する
  方が失敗しにくい。
- リンクは文章中で使われることが多いため、まずは `text` / rich text run の一部として
  扱う。任意矩形の独立 `link` schema は必要が明確になってから再検討する。
- ページ内リンクは新しい `anchorId` field を増やさず、まず `schema.name` を anchor と
  して使う。Markdown/JSX の authoring API で `id` を受ける場合も、template へ落とす
  時点では `name` に寄せる。
- GFM 準拠だけにこだわりすぎない。PDF 生成として自然で便利な表現は、GFM にないものでも
  pdfme の拡張として扱ってよい。ただし、その差分はドキュメントに明記する。

## 完了済み / PR 中

### PR #1463: リンク基盤

- `textFormat: "inline-markdown"` で `[label](https://example.com)` を扱い、PDF に
  URI Link annotation を生成する。
- unsafe URI scheme は allowlist で拒否する。
- `RichTextRun.href` を追加し、折り返されたリンクも表示行ごとに annotation を作る。
- viewer / read-only UI ではリンクを anchor として表示する。
- `[label](#schemaName)` を `schema.name` に解決し、PDF 内 GoTo link annotation を作る。
- missing / ambiguous internal link target を検出する。
- custom `basePdf` 由来の URI link annotation を出力 PDF に保持する。
- 独立 `link` schema は、文章中リンクの主要 API ではないため一旦スキップする。

### PR #1466: `@pdfme/jsx` MVP

- `packages/jsx` として `@pdfme/jsx` package を追加する。
- React に依存しない独自 `jsx-runtime` / `jsx-dev-runtime` を持つ。
- MVP component は `Page`, `Stack`, `Row`, `Box`, `Spacer`, `Text`, `List`, `Table`,
  `PageBreak`。
- `renderToTemplate` は通常の pdfme `Template` と `inputs` を返す。
- `Text` は `name` なしなら read-only `content`、`name` ありなら `inputs[name]` を持つ
  editable schema として扱う。
- `List` は実 `list` schema、`Table` は実 `table` schema に落とす。
- `@pdfme/common` に `PAGE_SIZE_PRESETS`, `resolvePageSize`, `detectPaperSize` を集約する。
- `@pdfme/schemas/types` を追加し、`@pdfme/jsx` が schema 型を再定義しないようにする。
- `@pdfme/schemas/utils` から `measureTextHeight` を公開し、`@pdfme/jsx` の `<Text>`
  自動高さ計算で pdfme 本体の text / rich text helper を再利用する。
- `renderToTemplate` は text measurement のため async にする。
- 複数 `Page` の `size` / `orientation` / `margin` 不一致や、非対応位置の `PageBreak`
  は silent ignore せず error にする。

## 次 PR 候補

### 1. `text` / `multiVariableText` の dynamic height

最優先候補。blank PDF で `table` / `list` が後続要素を押し下げるように、`text` と
`multiVariableText` も実描画高さに応じて後続要素を押し下げられる可能性がある。

現在の初回実装方針:

- 既存互換性を優先し、未指定時は従来通り `overflow: "visible"` として扱う。
- `overflow: "expand"` の時だけ `measureTextHeight` で実描画高さを測り、schema の高さを
  広げて後続要素を押し下げる。
- `expand` は grow-only とし、計測結果が元の schema height より小さい場合は縮めない。
- `dynamicFontSize` と `overflow: "expand"` が同時指定された場合は `expand` を優先する。
  計測と生成後の schema では `dynamicFontSize` を無効化し、元 box に縮小フィットして
  expand が効かなくなる silent な挙動を避ける。
- Designer では `overflow: "expand"` を選んだ時点で `dynamicFontSize` をクリアし、
  `expand` 中は Dynamic Font Size の切り替えを無効化する。JSON 由来で両方が残っている場合も
  runtime 側で `dynamicFontSize` を無視する。
- この排他制御は仕様として扱い、将来の docs / website / schema API docs では
  `overflow: "expand"` と `dynamicFontSize` は同時利用できないこと、expand では通常の
  `fontSize` を使って高さを広げることを明記する。
- `multiVariableText` は変数置換後の実描画テキストで高さを測る。
- ページ末尾を超える場合、今回の初回実装では「高さを持つ 1 つの単位」として次ページに
  回す、または大きすぎる場合はそのまま配置する。文章を行・段落単位で分割して次ページへ
  続ける処理は、text split range / rich text run / Form 編集体験まで含めた別設計として扱う。

検討すること:

- `measureTextHeight` を generator の dynamic layout に接続するか。
- `multiVariableText` も同じ計測・押し下げの仕組みに乗せられるか。
- `text`, `multiVariableText`, `list`, `table` の dynamic layout contract を共通化できるか。
- 長文 text / MVT がページ末尾を超える場合、行・段落単位のページ分割まで扱うか。
- blank PDF と custom `basePdf` で挙動を分ける必要があるか。
- 既存テンプレートへの互換性リスクをどう抑えるか。

初回スコープ案:

- まず blank PDF の dynamic template のみ対象にする。
- `text` の auto height と後続 schema の押し下げを実装する。
- MVT は同じ設計で入れられるか確認し、リスクが高ければ別 PR に分ける。
- page split は設計だけ残し、初回は split しない選択肢も持つ。

### 2. `@pdfme/jsx` component 拡張

`md2pdf` を見据えると、MVP だけでは表現力が足りない。優先度は以下。

- `MultiVariableText`: 固定文の中に入力欄を含む文章のために必要。
- `Image`: Markdown image と AI template generation の両方で必要。
- `Svg`: アイコンや簡単な図形に必要。
- `Line`: blockquote や区切り線に必要。
- `Absolute`: stacking layout から外れた補助配置に必要。ただし乱用されると JSX の価値が
  薄れるため、API は慎重にする。

### 3. `@pdfme/jsx` layout 品質の改善

- CSS/Flexbox 互換を目指すのではなく、flexbox の使いやすさだけを `Stack` / `Row`
  の authoring API に取り込む。
- 優先候補は `justifyContent`, `alignItems`, `flex` / `flexGrow`, `margin`。
- `flexWrap`, `flexShrink`, media query, full `style` prop, transform 全般、CSS parser は
  当面対象外にする。
- `%` width は将来的に検討してよいが、まずは `flex` / `flexGrow` で多くの比率指定を
  表現できるか確認する。`height%` は layout engine が複雑になるため慎重に扱う。
- `Table` / `List` の dynamic layout と `PageBreak` の組み合わせを検証する。
- `PageBreak` 以外の自動 pagination をどこまで `@pdfme/jsx` で持つか決める。
- header / footer を `basePdf.staticSchema` に接続するか検討する。
- row/stack/box の layout core を Markdown frontend から使えるように切り出せるか検討する。

### 4. `md2pdf` / GFM MVP

- `converter` package に `md2pdf` の入口を追加する。
- Markdown parser は `remark-gfm` / `micromark` 系を候補にする。
- AST から `@pdfme/jsx` 相当の layout tree を作り、pdfme `Template` / `inputs` に変換する。
- まず paragraph, heading, list, table, code block, blockquote, link, image の基本形を扱う。

## GFM 対応で足りないこと

### Inline / Rich Text

- GFM link と autolink は linked rich text run に変換する。
- GFM heading links は slug を作り、対応する heading `text` schema の `name` にする。
- `textFormat: "inline-markdown"` は、部分的な下線も表現できるようにしたい。これは GFM
  にはないが、PDF の文章表現としては一般的に有用。
- table cell / list item 内の bold, italic, inline code, link をどう保持するか決める。
- pdfme の `inline-markdown` は Designer 上の軽量記法として残し、GFM 完全対応は
  converter 側の AST pipeline に任せる。

### Block Layout

- GFM list item は複数 paragraph, nested list, code block, blockquote を含められる。
  現在の `list` schema の `string[] + tab indent` だけでは表現しきれない可能性がある。
- task list は checkbox + text/list の組み合わせか、list schema 拡張が必要。
- GFM table の基本形は `table` schema に落とせるが、cell 内 rich inline content は追加検討。
- fenced code block / indented code block は当面 `rectangle + text` で表現できるが、
  等幅フォント、空白保持、長い行、syntax highlight、ページ分割を考えると専用 layout が欲しい。
- blockquote は `line + text` で見た目を作れるが、container block として中に paragraph /
  list / code / table を持つ可能性がある。

### Link / Annotation

- `[label](#heading)` は heading slug から `schema.name` に解決する。
- `[![alt](img)](url)` は image schema + link annotation として表現する。
- 画像全体・カード全体などのクリック領域が必要になったら、任意矩形の `link` schema を
  再検討する。

### Pagination

- Markdown paragraph は可変長なので、自動高さ計算と後続要素の押し下げが必要。
- 長文 text / code block / blockquote / list item をページ分割する contract が必要。
- `@pdfme/jsx`, `converter`, `generator` のどこが pagination 責務を持つか決める。

### Documentation

- GFM と pdfme 独自拡張の境界を明記する。
- 例えば inline underline は GFM にはないが、PDF 向けの inline-markdown 拡張として
  documented feature にする。
- 複雑な list item など、GFM を単一の既存 schema に完全には写像できない箇所は、
  どの程度対応するか、どこから複数 schema / layout container に分解するかを説明する。

## 未決事項

- `text` / `multiVariableText` の dynamic height を既存 dynamic template にどう統合するか。
- MVT の inline link 対応をどのタイミングで入れるか。
- table cell / list item の rich inline content を schema 拡張で扱うか、複数 schema に分解するか。
- link の見た目をデフォルトで青 + 下線にするか、明示的 styling に任せるか。
- Designer で通常のテキスト編集を難しくせずにリンク編集 UI をどう出すか。
- 独立 `link` schema をクリック領域用の補助として追加するべきか。
- `@pdfme/jsx` の `Absolute` をどこまで推奨するか。
- `md2pdf` の出力 API を `Template` のみにするか、`Template` + `inputs` + assets metadata にするか。

## 参考

- pdfme issue #319: HyperLink Schema の追加
  - https://github.com/pdfme/pdfme/issues/319
- pdfme issue #239: `generate` によって `basePdf` のリンクが消える問題
  - https://github.com/pdfme/pdfme/issues/239
- pdf-lib issue #555: 低レベルなリンク annotation 実装についての議論
  - https://github.com/Hopding/pdf-lib/issues/555
- GFM spec
  - https://github.github.com/gfm/
