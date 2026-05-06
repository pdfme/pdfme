# JSX / md2pdf ロードマップ

最終更新: 2026-05-06

## 目的

`@pdfme/jsx` で stacking layout を使った template authoring を整備し、その考え方を
`converter` package の `md2pdf` に応用する。最終的には Markdown/GFM AST から、通常の
pdfme `Template` と `inputs` を生成できるようにする。

## 基本方針

- Markdown 文書全体を 1 つの巨大な schema に押し込まない。
- GFM AST を layout tree に変換し、`text`, `multiVariableText`, `list`, `table`,
  `image`, `line`, `rectangle` など複数の schema に分解する。
- `@pdfme/jsx` は、その layout tree を手で書く authoring DSL として扱う。`md2pdf` は
  Markdown AST から同じ方向の layout tree を作る別 frontend として扱う。
- `@pdfme/jsx` は generator の必須依存にしない。出力は通常の pdfme `Template` と
  `inputs` にする。
- AI が template を生成する時も、絶対座標 JSON を直接作るより、`Stack`, `Row`, `Box`,
  `Text`, `List`, `Table` などの意味構造から template に変換する方が失敗しにくい。
- GFM 準拠だけにこだわりすぎない。PDF 生成として自然で便利な表現は pdfme の拡張として扱い、
  GFM との差分は docs に明記する。

## 現在地

- main にはリンク基盤、`@pdfme/jsx` MVP、text / MVT dynamic layout、split metadata 共通化、
  custom `basePdf` 制御、dynamic layout docs、MVT split chunk 編集、`MultiVariableText`
  component、visual components、editable `Text` の inline-markdown guard、MVT split chunk の
  連続編集検証、JSX layout の `margin` / `alignItems` / `justifyContent` / `flexGrow`、
  `Static` / `Header` / `Footer` による `staticSchema` support、`Absolute` による manual placement
  補助まで入っている。
- `md2pdf` MVP は `converter` package に実装を開始した。初期 API は `Template + inputs` を返し、
  parser は `unified` + `remark-parse` + `remark-gfm` を使う。
- `Barcode`, `Date`, Form 系 schema は md2pdf でのユースケースがまだ薄いため一旦スキップする。
- 次の主な判断軸は、`@pdfme/jsx` の layout 品質、`md2pdf` MVP の写像範囲、GFM と pdfme
  独自拡張の境界。

## 次に進めること

### 1. `md2pdf` / GFM MVP の実装

- `converter` package の `md2pdf` 入口を整える。
- 初期 API は `Template + inputs` を返す。warnings / assets / anchors metadata は必要になった時に
  追加検討する。
- MVP の対象は paragraph, heading, list, table, code block, blockquote, horizontal rule, link,
  data URI image。
- remote Markdown image は初期実装では link text に fallback する。画像 fetch / asset metadata は
  次段階で検討する。
- `@pdfme/jsx` と同じ layout tree / builder を共有できるかは継続検討。直接 JSX runtime に依存するより、
  Markdown AST -> intermediate layout nodes -> pdfme template の形にできると保守しやすい。
- 追加で確認したいこと: generator + built-in schemas で実際に PDF 生成する integration test、
  playground / docs への最小サンプル、heading anchor の出力仕様。

### 2. `@pdfme/jsx` layout 品質フォローアップ

- CSS/Flexbox 互換を目指さず、flexbox の使いやすさだけを `Stack` / `Row` に取り込む。
- `flexWrap`, `flexShrink`, media query, full `style` prop, CSS parser は当面対象外。
- `%` width は将来検討でよい。まずは `flex` / `flexGrow` で比率指定を表現する。
- `Absolute` は `Page`, top `Static`, `Box` 内の小さな escape hatch として扱う。`Stack` / `Row`
  直下対応、anchor / top-right / bottom-right shorthand、z-index 的な描画順制御は必要性が出てから検討する。

### 3. `@pdfme/jsx` examples / docs

- invoice / report / markdown article など、AI や人間が真似しやすい `@pdfme/jsx` サンプルを追加する。
- `Static`, `Header`, `Footer`, `Absolute`, dynamic height の使いどころを docs に整理する。

## 仕様メモ

- リンクは文章中で使われることが多いため、`text` / rich text run の一部として扱う。独立
  `link` schema は、画像全体・カード全体などクリック領域が必要になった時に再検討する。
- ページ内リンクは新しい `anchorId` field を増やさず、`schema.name` を anchor として使う。
  JSX / Markdown 側で `id` を受ける場合も template へ落とす時点では `name` に寄せる。
- `overflow: "expand"` は blank PDF 向けの dynamic layout。custom `basePdf` では Designer で
  選択不可にし、既存値も effective `visible` として扱う。
- `overflow: "expand"` と `dynamicFontSize` は同時利用不可。`expand` では通常の `fontSize` で
  高さを広げる。
- split metadata は `__splitRange: { unit, start, end }` に統一済み。通常の authoring API では
  直接触らない。
- `text` schema の inline-markdown split chunk は Form 上では read-only のまま。MVT は
  plain / inline-markdown ともに変数値だけ編集できる。
- MVT split chunk の連続編集は、各 blur 後に reflow された最新 input を次の chunk が受け取る
  前提で扱う。plain / inline-markdown ともに回帰テストで固定する。
- `@pdfme/jsx` の `Text` component は read-only authoring が主用途。editable `Text` には
  `textFormat: "inline-markdown"` を指定できないようにする。
- MVT の static link は Form 上でも clickable。変数 span が link run に含まれる場合は入力を優先する。
- link の見た目はデフォルトで青 + 下線にする。将来的には theme / style でカスタマイズできるようにする。
- Designer の link 編集は、当面 inline-markdown 文字列を直接編集する前提にする。専用 UI は後回し。
- `md2pdf` の初期 API は `Template + inputs` を返す形でよい。warnings / assets / anchors metadata は
  必要になった時に追加検討する。
- `Absolute` は flow に参加しない overlay。座標は親の layout frame 基準で、`Page` body 内では page
  margin 内、`Static` 内では page 全体、`Box` 内では box content frame。bottom `Static` 内では使えない。

## GFM / md2pdf で足りないこと

### Inline / Rich Text

- GFM link / autolink は linked rich text run に変換する。
- heading link は slug を作り、対応する heading schema の `name` にする。
- `inline-markdown` は部分的な下線も表現できるようにしたい。これは GFM にはないが PDF では有用。
- table cell / list item 内の bold, italic, inline code, link をどう保持するか決める。
- pdfme の `inline-markdown` は Designer 上の軽量記法として残し、GFM 完全対応は converter 側の
  AST pipeline に寄せる。

### Block Layout

- GFM list item は paragraph, nested list, code block, blockquote を含められる。MVP では `list`
  schema の `string[] + tab indent` に落とすが、複雑な list item は表現しきれない可能性がある。
- task list は MVP では `[x]` / `[ ]` prefix に落とす。checkbox + text/list の組み合わせや
  list schema 拡張は後回し。
- GFM table の基本形は `table` schema に落とせるが、cell 内 rich inline content は追加検討。
- code block は `rectangle + text` で始められるが、等幅フォント、空白保持、長い行、syntax highlight、
  ページ分割を考えると専用 layout が欲しい。
- blockquote は `line + text` で始められるが、中に paragraph / list / code / table を持てる点に注意する。
- remote Markdown image と `[![alt](img)](url)` は image fetch / link annotation の設計が必要。

### Pagination

- Markdown paragraph は可変長なので、`overflow: "expand"` と dynamic template reflow を自然に使う。
- 長文 text / MVT は行単位分割できる。code block / blockquote / 複雑な list item は既存 schema
  の split で足りるか、container 単位の分割が必要かを検証する。
- keep-together、widow/orphan、live pagination は layout 品質改善の中で扱う。

## 完了済み

- PR #1463: text inline-markdown link、PDF URI / GoTo annotation、basePdf 由来 URI link 保持。
- PR #1466: `@pdfme/jsx` MVP、独自 JSX runtime、`Page` / `Stack` / `Row` / `Box` / `Text` /
  `List` / `Table` / `PageBreak`、page size 共通化、schema 型 export。
- PR #1467: text / MVT の `overflow: "expand"`、grow-only dynamic height、行単位 split、
  `expand` と `dynamicFontSize` の排他仕様。
- PR #1469: `__bodyRange` / `__itemRange` / `__textLineRange` を `__splitRange` に統一。
- PR #1470: custom `basePdf` では text / MVT の `overflow: "expand"` を選択不可にする。
- PR #1471: dynamic layout docs を追加。
- PR #1472: plain MVT split chunk の Form 変数編集。
- PR #1474: inline-markdown MVT split chunk の Form 変数編集、static link の clickable 表示。
- PR #1475: `@pdfme/jsx` `MultiVariableText` component。
- PR #1476: `@pdfme/jsx` `Image`, `Svg`, `Rectangle`, `Ellipse`, `Line` visual components。
- PR #1477: `@pdfme/jsx` editable `Text` で `textFormat: "inline-markdown"` を禁止。
- PR #1478: MVT split chunk の連続編集を plain / inline-markdown ともに回帰テストで固定。
- PR #1479: `@pdfme/jsx` layout に `margin` と `alignItems` を追加。
- PR #1480: `@pdfme/jsx` layout に `justifyContent`, `flexGrow`, `flex` を追加。
- PR #1481: `@pdfme/jsx` `Static placement="top" | "bottom"`、`Header` / `Footer` alias、
  blank `basePdf.staticSchema` support を追加。
- PR #1482: `@pdfme/jsx` `Absolute` manual placement helper を追加。

## 参考

- pdfme issue #319: HyperLink Schema の追加
  - https://github.com/pdfme/pdfme/issues/319
- pdfme issue #239: `generate` によって `basePdf` のリンクが消える問題
  - https://github.com/pdfme/pdfme/issues/239
- pdf-lib issue #555: 低レベルなリンク annotation 実装についての議論
  - https://github.com/Hopding/pdf-lib/issues/555
- GFM spec
  - https://github.github.com/gfm/
