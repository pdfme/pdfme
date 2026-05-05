# リンク対応計画

最終更新: 2026-05-05

## 目的

pdfme にリンクを第一級の機能として追加する。まずは生成される PDF 内のリンクを
扱えるようにし、その後の `md2pdf` / GFM 対応にもつながる設計にする。

## 参考

- pdfme issue #319: HyperLink Schema の追加
  - https://github.com/pdfme/pdfme/issues/319
- pdfme issue #239: `generate` によって `basePdf` のリンクが消える問題
  - https://github.com/pdfme/pdfme/issues/239
- pdf-lib issue #555: 低レベルなリンク annotation 実装についての議論
  - https://github.com/Hopding/pdf-lib/issues/555
- GFM spec: links / autolinks / images
  - https://github.github.com/gfm/

## 現状理解

- `@pdfme/schemas` には、現時点で hyperlink 専用 schema はない。
- `TextSchema` の rich text run は bold / italic / strikethrough / inline code
  を扱えるが、`href` のようなリンク情報は持っていない。
- `textFormat: "inline-markdown"` は pdfme の軽量な inline 記法であり、
  GFM 全体を parse するためのものではない。
- `md2pdf` では、Markdown 文書全体を 1 つの schema に押し込まない。
  Markdown を AST として parse し、その AST を stack/layout tree に変換し、
  `text`, `list`, `table`, `image`, `line`, `rectangle`、将来的な link annotation
  など複数の pdfme schema として出力する。
- `@pdfme/jsx` は、この変換のための小さな authoring/layout layer になり得る。
  JSX は layout tree を作るための 1 つの入口であり、Markdown 変換は同じ
  schema 生成用 layout core を利用する別の入口になる。
- `@pdfme/generator` は現在、custom `basePdf` のページを page XObject として
  embed し、新しいページに `drawPage` している。見た目のページ内容は残るが、
  既存リンクなどの annotation はページ描画内容ではないため、issue #239 の
  ようにリンクが失われる。

## `@pdfme/jsx` の位置づけ

- package 名は `@pdfme/jsx` でよい。
- 参考実装は既存の `react-pdfme-jsx/packages/pdf-jsx` POC。
  ただしこれは POC として扱い、そのまま本体に移植しない。
- 目的は、JSX を authoring DSL として使い、stacking layout を pdfme の
  絶対座標 template に変換すること。
- `@pdfme/jsx` は generator の必須依存にはしない。
  出力はあくまで通常の `Template` と `inputs` にする。
- `converter` の `md2pdf` は、将来的に `@pdfme/jsx` の layout/builder の考え方、
  またはそこから切り出した非 React の layout core を再利用する。
- JSX は layout tree を手で書く入口、Markdown 変換は GFM AST から同じ layout tree
  を作る入口、という関係にする。
- `@pdfme/jsx` があれば JSX から pdfme template を生成できるため、AI がテンプレートを
  作成する際にも効率が上がる。絶対座標 JSON を直接生成させるより、`Stack`, `Row`,
  `Box`, `Text`, `Table`, `List` などの意味的な構造を生成させ、その結果を pdfme
  template に変換する方が、保守しやすく失敗しにくい。

### POC から参考にする要素

- `Page`, `Stack`, `Row`, `Box`, `Spacer`, `Absolute` のような layout primitive。
- `Text`, `MultiVariableText`, `Table`, `List`, `Image`, `Svg`, `Line` を pdfme schema
  に薄く変換する考え方。
- `PageBreak` による明示的な論理ページ分割。
- `staticHeader` / `staticFooter` 的な発想。ただし pdfme の `basePdf.staticSchema`
  や padding とどう接続するかは再設計する。

### POC からそのまま持ち込まない要素

- text measurement の独自実装。
  pdfme 本体の `text/helper` や rich text layout を再利用・公開する方向を優先する。
- 独自 pagination を大きく育てること。
  table/list の動的分割は `getDynamicTemplate` / `getDynamicLayoutForTable` /
  `getDynamicLayoutForList` の仕組みに寄せる。
- private metadata に強く依存する設計。
  必要な split range や layout metadata は schema 側の公式 contract として整理する。

## `md2pdf` / GFM を見据えた不足点

- link:
  - GFM の `[label](url)` と autolink を PDF の clickable annotation にする必要がある。
  - 文章中で使われるため、独立 schema より `text` / rich text run 内の link 対応を
    優先する。
  - GFM の `[label](#heading)` のようなページ内リンクは、まず `#schemaName` として
    `schema.name` に解決する方針にする。`anchorId` のような新しい共通 field は、
    `name` では不足する要求が明確になってから検討する。
  - `@pdfme/jsx` / `md2pdf` の authoring API では HTML/Markdown と同じ感覚で
    `id` を受けてもよいが、pdfme template へ落とす時点では `schema.name` に変換する。
- rich text model:
  - `RichTextRun.href?: string` のようなリンク情報が必要。
  - wrapped link は複数行にまたがるため、line/run layout から annotation 矩形を
    生成できる必要がある。
- inline parser:
  - pdfme の `inline-markdown` は軽量 subset として残す。
  - GFM 完全対応は `remark-gfm` / `micromark` 系で AST を作り、converter 側で
    pdfme の rich text / schema に落とす。
- Text / MultiVariableText:
  - 静的な装飾文は read-only `text` + rich text が自然。
  - 固定文の中に入力欄がある場合は `multiVariableText` が自然。
  - editable な通常 `text` と rich inline editing を同時に成立させるのは難しいため、
    入力つき文章は MVT を中心に考える。
- List:
  - main には `list` schema があるので、`<List>` や Markdown list は実 `list`
    schema に落とす。
  - ただし GFM の list item は複数 paragraph / nested list / code block /
    blockquote を含められる。現在の `string[] + tab indent` だけでは複雑な list item
    を表現しきれない可能性がある。
  - task list は checkbox と text/list の組み合わせ、または list schema 拡張が必要。
- Table:
  - GFM table の基本形は `table` schema に落とせる。
  - ただし cell 内の link / bold / italic / inline code など rich inline content は
    追加検討が必要。
- Code block:
  - fenced code block / indented code block 用の専用 schema はない。
  - 当面は `rectangle + text` で表現できるが、等幅フォント、空白保持、長い行、
    syntax highlight、ページ分割を考えると専用 layout または schema が欲しい。
- Blockquote:
  - `line + text` で見た目は作れる。
  - ただし blockquote は container block なので、中に paragraph/list/code/table が
    入る場合は layout container として扱う必要がある。
- Text auto height / page split:
  - Markdown paragraph は長さが可変なので、自動高さ計算と後続要素の押し下げが必要。
  - 長文 text のページ分割をどう扱うかは、`@pdfme/jsx` / converter / generator の
    境界で設計が必要。
- Image link:
  - `[![alt](img)](url)` は image schema に link annotation を重ねる必要がある。

## Phase 1: テキスト内リンク

- [x] inline link を主要 API として扱う。
  - リンクは多くの場合文章中で使われるため、独立した絶対配置 schema だけでなく、
    まず `text` / rich text rendering の中で扱えるようにする。
  - 候補となる Markdown 記法: `textFormat: "inline-markdown"` で
    `[label](https://example.com)` を扱う。
  - 候補となる構造化モデル: `RichTextRun.href?: string`。
  - 将来的な PDF 内部ページ遷移の余地は残しつつ、まずは外部 URI リンクから始める。
- [x] PDF link annotation を作成する低レベル helper を追加する。
  - `/Subtype /Link` と `/A << /S /URI /URI (...) >>` を持つ annotation を作る。
  - URI は `http:`, `https:`, `mailto:` の allowlist に限定する。
  - ページ内リンクは `[label](#schemaName)` を `schema.name` に解決し、
    `/A << /S /GoTo /D [...] >>` の annotation を作る。
  - 既存ページの `Annots` array を置き換えず、追記する。
  - border は透明、または設定可能にする。
- [x] rich text layout/rendering を拡張し、リンク部分の位置情報を保持する。
  - 折り返されたリンクは複数行にまたがる可能性があるため、表示されるリンク断片ごとに
    annotation を作る。
  - PDF 描画と annotation 配置で同じ line/run layout 情報を再利用する。
- [x] read-only inline link の UI rendering を更新する。
  - viewer / read-only mode では、リンク付きテキストを anchor 風に表示する。
  - Designer / form の編集時は、inline-markdown が有効な箇所では Markdown ソースを
    テキストとして編集する挙動を維持してよい。
- [x] テストを追加する。
  - `text` schema 内の `[label](url)` が URI action 付き Link annotation を作ること。
  - `text` schema 内の `[label](#schemaName)` が GoTo action 付き Link annotation を
    作ること。
  - 折り返されたリンクが、表示行ごとの annotation を作ること。
  - 同じページに annotation を追加しても既存 annotation を消さないこと。
  - ページ内リンクの missing / ambiguous target を検出すること。

## Phase 2: 任意の配置リンク schema（スキップ）

- [x] 独立した `link` schema は一旦不要としてスキップする。
  - 画像全体へのリンク、カード全体へのリンク、任意のクリック領域には有用。
  - ただし文章中リンクの主要抽象ではなく、矩形 annotation 用の補助 schema として扱う。
- [x] 必要になったら、任意の矩形に annotation を貼るシンプルな schema として再検討する。
  - 必要であれば可視テキストの styling も持たせる。

## Phase 3: `basePdf` 由来リンクの保持

- [x] 既存 URI link を含む fixture PDF を作り、issue #239 を再現する。
- [x] 保持戦略を決める。
  - 現在の generator は base page を XObject として embed しているため、annotation は
    page content として描画されない。
  - 選択肢:
    - source base page の annotation を、出力先の inserted page に copy する。
    - 可能な場合は embed ではなく page copy を使う。
    - 互換性リスクがある場合は generator option を追加する。
- [x] 座標ずれに強い annotation copy を実装する。
  - まずは URI link annotation の保持を優先する。
  - media box offset と page size transform を考慮する。
  - ユーザーが渡した base PDF data を破壊しない。
- [x] basePdf links の regression test を追加する。
  - unsafe URI scheme は保持しない。

## Phase 4: `@pdfme/jsx` の作成

- [x] `packages/jsx` として `@pdfme/jsx` package を追加するか判断し、package 境界を決める。
  - generator / common / schemas の必須依存にはしない。
  - 出力は通常の pdfme `Template` と `inputs` にする。
- [x] MVP の JSX component API の最小セットを決める。
  - 初回実装は `Page`, `Stack`, `Row`, `Box`, `Spacer`, `Text`, `List`, `Table`,
    `PageBreak` に絞る。
  - `Absolute`, `MultiVariableText`, `Image`, `Svg`, `Line` は次の拡張候補として残す。
- [x] POC の layout primitive を参考に、production 用の小さな layout core を設計する。
  - React/JSX frontend と Markdown AST frontend の両方から使えるよう、可能なら非 React の
    builder/layout core を切り出す。
  - 初回実装では React を依存にせず、`@pdfme/jsx/jsx-runtime` / `jsx-dev-runtime` を
    package 内に持つ独自 JSX runtime にする。
  - text measurement は POC の実装をコピーせず、pdfme 本体の text/rich text helper を
    利用・公開する。
  - `@pdfme/schemas/utils` から text/rich text の高さ計測 helper を公開し、`@pdfme/jsx`
    の `<Text>` 自動高さ計算で利用する。
- [x] JSX から pdfme schema への変換方針を決める。
  - `<List>` は実 `list` schema に落とす。
  - `<Table>` は実 `table` schema に落とす。
  - `<Text>` は `name` なしなら read-only `content`、`name` ありなら `inputs[name]`
    を持つ editable schema として扱う。
  - `textFormat="inline-markdown"` は schema にそのまま渡し、リンク対応済みの text
    schema を利用する。
  - 入力欄を含む文章は `MultiVariableText` を優先する。
- [x] `@pdfme/schemas/types` を追加し、`@pdfme/jsx` が text/list/table の schema 型を
  再定義しないようにする。
  - JSX Props は軽い authoring API として残しつつ、`ALIGNMENT`, `TEXT_FORMAT`,
    `LIST_STYLE`, `CellStyle`, `TextSchema`, `ListSchema`, `TableSchema` などの型は
    schemas package から参照する。
- [x] AI template generation の入口として使いやすい API にする。
  - AI には絶対座標 JSON ではなく、`Stack` / `Row` / `Box` / `Text` などの意味構造を
    生成させる。
  - その JSX/layout tree を pdfme template に変換することで、テンプレート生成の失敗を
    減らす。
- [x] JSX package の MVP テストを追加する。
  - Stack/Row/Box の基本 layout。
  - Text/List/Table の schema 変換。
  - PageBreak と複数 page。
  - `Template` / `inputs` の出力形。
- [ ] JSX package の追加拡張を実装する。
  - `MultiVariableText`, `Absolute`, `Image`, `Svg`, `Line`。
  - `Table` / `List` の dynamic layout と `PageBreak` の組み合わせの追加検証。
- [ ] 次 PR の検討事項: `text` / `multiVariableText` の dynamic height 対応。
  - blank PDF で `table` / `list` が後続要素を押し下げるように、`text` と
    `multiVariableText` も実描画高さに応じて後続要素を押し下げられる可能性がある。
  - ただし既存の dynamic layout との統合、`text` / `multiVariableText` / `list` /
    `table` の共通化、ページ分割の contract 整理を伴うため、`#1466` ではなく次 PR で
    設計・実装する。

## Phase 5: `md2pdf` / GFM フォローアップ

- [ ] `md2pdf` は Markdown 文字列を単一 schema に変換するのではなく、
  AST-to-layout 変換として扱う。
- [ ] 既存の `react-pdfme-jsx/packages/pdf-jsx` POC の
  `@pdfme/jsx` layout/builder の考え方を再利用する。ただし production 実装はより小さく、
  pdfme の schema primitive に近い形にする。
- [ ] `md2pdf` / GFM を見据えた不足点を先に、または並行して解消する。
  - text / rich text 内 link と PDF annotation。
  - `RichTextRun.href` などの structured rich text model。
  - linked inline content の layout geometry。
  - list item 内の複数 block / task list。
  - table cell 内の rich inline content。
  - code block の layout。
  - blockquote の container layout。
  - long text の auto height / page split。
  - image link の annotation。
- [ ] GFM links はデフォルトで linked rich text run に変換する。
- [ ] GFM heading links は `#schemaName` として解決する。
  - generator の inline-markdown では `[label](#schemaName)` から GoTo annotation への
    解決に対応済み。ここでは Markdown heading slug 生成と schema `name` への変換を扱う。
  - Markdown heading の slug は、対応する heading `text` schema の `name` にする。
  - JSX では `<Heading id="chapter-1">` / `<Link to="#chapter-1">` のように書けるが、
    template では `name: "chapter-1"` に寄せる。
  - 同一生成単位内で同名 schema が複数ある場合は、ページ内リンクの解決時に warning
    または error にする。
- [ ] image link、例えば `[![alt](img)](url)` は image schema + link annotation に変換する。
- [ ] table cell / list item 内の linked inline content 対応を再検討する。
- [ ] converter の parsing と schema rendering は分離しておく。

## 未決事項

- text / rich text links 対応後に、独立した `link` schema をクリック領域用の補助として
  追加するべきか。
- リンクの見た目をデフォルトで青 + 下線にするか、完全に明示的な styling に任せるか。
- Designer で、通常のテキスト編集を難しくせずにリンク編集 UI をどう出すか。
