# JSX / md2pdf ロードマップ

最終更新: 2026-05-06

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

## 現在地

- リンク基盤、`@pdfme/jsx` MVP、text / MVT の `overflow: "expand"`、行単位 page split、
  custom `basePdf` 制御、dynamic layout docs は main に入った。
- `multiVariableText` の split chunk は、plain / inline-markdown ともに Form 上で変数値だけ編集できる。
- Form mode の inline link は、入力要素ではない static text 部分だけ viewer と同じく clickable にする。
  変数 span 自体が link run に含まれる場合は入力を優先し、clickable anchor にはしない。
- `text` schema の inline-markdown split chunk は Form 上では read-only のまま残す。
- 次の大きな判断は、dynamic layout の編集体験をどこまで広げるかと、`@pdfme/jsx` / `md2pdf`
  に進む前にどの schema 表現を追加するか。

## 完了済み

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

### PR #1467: `text` / `multiVariableText` の dynamic height

- `overflow: "expand"` を追加し、blank PDF では実描画高さに応じて後続 schema を押し下げる。
- `expand` は grow-only とし、計測結果が元の schema height より小さい場合は縮めない。
- `dynamicFontSize` と `overflow: "expand"` が同時指定された場合は `expand` を優先する。
  計測と生成後の schema では `dynamicFontSize` を無効化し、元 box に縮小フィットして
  expand が効かなくなる silent な挙動を避ける。
- Designer では `overflow: "expand"` へ変更した時点で `dynamicFontSize` をクリアし、
  `expand` 中は Dynamic Font Size の切り替えを無効化する。このクリア処理は prop panel
  schema 生成中の副作用ではなく、UI の変更イベント側で行う。JSON 由来で両方が残っている場合も
  runtime 側で `dynamicFontSize` を無視する。
- この排他制御は仕様として扱い、将来の docs / website / schema API docs では
  `overflow: "expand"` と `dynamicFontSize` は同時利用できないこと、expand では通常の
  `fontSize` を使って高さを広げることを明記する。
- custom `basePdf` では dynamic template による reflow / page split が適用されないため、
  Designer では `overflow: "expand"` を選択不可にする。既存テンプレートで `expand` が残っている
  場合も Designer 上では `visible` に戻し、効かない `expand` が `dynamicFontSize` まで無効化する
  中途半端な状態を避ける。この制約も docs に明記する。
- `multiVariableText` は変数置換後の実描画テキストで高さを測る。
- ページ末尾を超える場合、text / `multiVariableText` は行単位で
  `__splitRange: { unit: "textLine", start, end }` を持つ split schema に分割し、次ページへ続ける。
  plain text と inline-markdown は同じ line layout を使い、PDF / UI preview で split chunk が
  同じ input 全体を重複描画しないようにする。
- inline-markdown の split chunk は markdown 記法が行境界で分断される可能性があるため、`text`
  schema は Form 上では read-only 表示に寄せる。編集対象は Designer / template authoring 側に寄せる。

### PR #1469: dynamic layout split range の共通化

- `table`, `list`, `text`, `multiVariableText` の split chunk 範囲表現を
  `__splitRange: { unit, start, end }` に一本化する。
- 旧 `__bodyRange` / `__itemRange` / `__textLineRange` は削除する。
- 内蔵 unit は `tableBody`, `listItem`, `textLine` として公開し、外部 plugin 用の独自 unit は
  `string` として許容する。

### PR #1470: custom `basePdf` での `overflow: "expand"` 制御

- custom `basePdf` では dynamic template による reflow / page split が適用されないため、
  Designer では `text` / `multiVariableText` の `overflow: "expand"` を選択不可にする。
- 既存テンプレートで `expand` が残っている場合も、custom `basePdf` では effective
  `visible` として扱い、効かない `expand` が `dynamicFontSize` まで無効化する状態を避ける。

### PR #1471: dynamic layout docs

- docs / website に `overflow: "expand"` の仕様を書く。
- `overflow: "expand"` と `dynamicFontSize` は同時利用できないことを明記する。
- custom `basePdf` では dynamic layout / page break が適用されず、`text` / `multiVariableText`
  の `overflow: "expand"` を使えないことを明記する。
- Designer 上では dynamic layout を実行せず、Preview / Form / Viewer / generate で reflow
  されることを明記する。
- `__splitRange` は内部 dynamic layout metadata であり、通常テンプレート authoring API では
  直接触らないことを説明する。

### PR #1472: plain `multiVariableText` split chunk の Form 編集

- plain `multiVariableText` の split chunk は、Form 上で表示範囲内の変数 span を編集できるようにする。
- 編集結果は JSON input の該当変数範囲へ戻し、別ページに分割された同じ input の内容を消さない。
- soft-wrap、同じ変数の複数参照、空白を含む値、空値のケースをテストで固定する。
- inline-markdown の split chunk は、rich text AST / selection editing の設計が必要なため read-only
  のまま残す。

### PR #1474: inline-markdown `multiVariableText` split chunk の変数編集

- inline-markdown `multiVariableText` の split chunk は、Form 上で表示範囲内の変数値だけ編集できる。
- template の markdown 記法、static text、link は Form では編集対象にしない。
- 変数値に `**` や `` ` `` などの markdown delimiter が含まれても、変数値として literal に扱う。
  計測時は escape 済みの値を使い、再描画時に変数値が markdown として再解釈されないようにする。
- link は Form 上でも static text 部分なら clickable にする。変数 span が link run に含まれる場合は
  入力を優先し、clickable anchor にはしない。

## 次 PR 候補

### 1. `text` schema inline-markdown split chunk 編集方針

直近で一番悩ましい残論点。すぐ実装するより、先に仕様を固定した方がよい。

- split 後の inline-markdown `text` を Form 上でも編集可能にするか、read-only 表示に限定するか決める。
- 編集可能にする場合は、markdown source string を直接編集するのか、rich text AST / run model を編集して
  source へ戻すのか決める。
- link / bold / italic / inline code が行境界で分断された場合の selection / blur / input merge 方針を決める。
- md2pdf を見据えると、strict GFM AST と pdfme inline-markdown の軽量記法を混ぜすぎないことに注意する。

### 2. dynamic layout pagination 品質

- 長文 text / MVT の段落単位 keep-together や widow/orphan 制御をどこまで扱うか決める。
- Form 編集中の live pagination を入れるか、Preview / generate 時のみ reflow する仕様で固定するか決める。
- split chunk 内の複数 variable span を連続編集した場合、blur の順序と reflow 後の最新 input を
  どう同期するか決める。
- `table`, `list`, `text`, `multiVariableText` 以外の schema に dynamic layout contract を広げるか検討する。
- 既存テンプレートに旧 dynamic metadata が残っている場合の扱いを docs / migration note に書く。

### 3. `@pdfme/jsx` component 拡張

`md2pdf` を見据えると、MVP だけでは表現力が足りない。優先度は以下。

- `MultiVariableText`: 固定文の中に入力欄を含む文章のために必要。
- `Image`: Markdown image と AI template generation の両方で必要。
- `Svg`: アイコンや簡単な図形に必要。
- `Line`: blockquote や区切り線に必要。
- `Absolute`: stacking layout から外れた補助配置に必要。ただし乱用されると JSX の価値が
  薄れるため、API は慎重にする。

### 4. `@pdfme/jsx` layout 品質の改善

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

### 5. `md2pdf` / GFM MVP

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

- Markdown paragraph は可変長なので、`overflow: "expand"` と dynamic template reflow を
  md2pdf / JSX の layout pipeline から自然に使えるようにする。
- 長文 text は `__splitRange` で行単位分割できる。code block / blockquote / 複雑な list item は、
  既存 schema の split で足りるか、layout container 単位の分割が必要かを検証する。
- `@pdfme/jsx`, `converter`, `generator` のどこが pagination 責務を持つか決める。

### Documentation

- GFM と pdfme 独自拡張の境界を明記する。
- 例えば inline underline は GFM にはないが、PDF 向けの inline-markdown 拡張として
  documented feature にする。
- 複雑な list item など、GFM を単一の既存 schema に完全には写像できない箇所は、
  どの程度対応するか、どこから複数 schema / layout container に分解するかを説明する。

## 未決事項

Dynamic layout / editing:

- `text` schema の split inline-markdown 編集をサポートするか、read-only 表示に限定するか。
- split chunk 内の複数 variable span を連続編集した場合、blur の順序と reflow 後の最新 input を
  どう同期するか。必要なら live pagination / editing session の設計と合わせて扱う。
- custom `basePdf` では dynamic layout を無効にする現行方針で固定するか、将来的に限定的な reflow
  支援を検討するか。
- 既存テンプレートに旧 dynamic metadata が残っている場合の migration / docs をどう扱うか。

Rich content / link:

- MVT の inline link 対応をどのタイミングで入れるか。
- table cell / list item の rich inline content を schema 拡張で扱うか、複数 schema に分解するか。
- link の見た目をデフォルトで青 + 下線にするか、明示的 styling に任せるか。
- Designer で通常のテキスト編集を難しくせずにリンク編集 UI をどう出すか。
- 独立 `link` schema をクリック領域用の補助として追加するべきか。

JSX / md2pdf:

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
