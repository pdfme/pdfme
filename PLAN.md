# JSX / md2pdf ロードマップ

最終更新: 2026-05-11

## 目的

`@pdfme/jsx` で stacking layout を使った template authoring を整備し、その考え方を
`converter` package の `md2pdf` に応用する。`md2pdf` / `@pdfme/jsx` ともに beta playground と
docs が入り、Templates gallery / local project workspace から試せる状態になった。JSX / md2pdf の
starter source も `template-assets` に寄せたため、次は実際の authoring で詰まりやすい dynamic
container、md2pdf pagination / block layout、workspace 運用の順で磨く。

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

## 次に進めること

### 1. `@pdfme/jsx` layout / dynamic container フォローアップ

- Form 入力や dynamic layout reflow で `Text` / MVT が runtime に `overflow: "expand"` した場合、
  JSX の親 `Box` / container は自動では広がらない。生成後の `Box` は rectangle schema であり、
  子 schema の実描画高さと親 container を結び直す contract がまだないため。親子 container dynamic
  layout は実装したい重要課題として扱う。
- まずは JSX から生成された visual `Box` と子 text/MVT の関係を metadata として template に残す案と、
  単一 text/MVT 子の decoration に畳む案を比較する。
- CSS/Flexbox 互換を目指さず、flexbox の使いやすさだけを `Stack` / `Row` に取り込む。
- `flexWrap`, `flexShrink`, media query, full `style` prop, CSS parser は当面対象外。
- `%` width は将来検討でよい。まずは `flex` / `flexGrow` で比率指定を表現する。
- `Absolute` は `Page`, top `Static`, `Box` 内の小さな escape hatch として扱う。`Stack` / `Row`
  直下対応、anchor / top-right / bottom-right shorthand、z-index 的な描画順制御は必要性が出てから検討する。

### 2. `@pdfme/jsx` authoring UX フォローアップ

- `Document` root、margin-aware な `Header` / `Footer`、page 全体座標の `Static` は入った。Templates starter / docs
  を通じて repeated layer、margin area、`Absolute` origin が直感とズレないかを確認し、必要なら wording やサンプルを直す。
- `Header` / `Footer` の実用パターンとして、page number、repeated title、watermark / stamp などを starter に残す。
- React に慣れた人と AI authoring を主な利用者として意識する。`Text` / MVT は JSX render 時に高さを測れるため、
  starter / docs では「通常は `height` を書かない」体験に寄せる。固定 field、画像、absolute overlay など
  明示寸法が意味を持つ場所だけ `height` を書く。
- Starter source は `playground/public/template-assets/<name>/source.tsx` に置き、generated
  `template.json` / `metadata.json` と同じ単位で管理する。
- invoice、form、report、research paper、Japanese notice の starter は追加済み。次に増やすなら、
  Japanese business document、header/footer/page number 専用、watermark / badge 専用など、1 つの概念を
  小さく見せる starter を優先する。
- 編集の正は generated `Template + inputs`。JSX source は初期生成 / regeneration 用の metadata として扱う。
  Designer で編集した template を JSX に自動逆変換することは当面目指さない。
- JSX playground は source authoring と Viewer preview に寄せる。Form 入力確認は生成方法に依存しない共通 project 導線として
  FormViewer で行う。

### 3. `md2pdf` layout 品質フォローアップ

- heading 直後の keep-with-next、table / image / code block の keep-together、widow/orphan を検討する。
- 長い paragraph / list / table は generator dynamic layout に任せる方針を維持する。
- blockquote / code block / complex list item が既存 schema split で足りるかを検証する。

### 4. Playground project workspace polish

- Templates gallery / local project workspace、rename / duplicate / Save As は追加済み。しばらく実運用し、
  「保存した project が増えても軽く、壊れず、見つけやすいか」を見る。
- Local project metadata edit は現時点では入れない。sample / starter の metadata は
  `playground/public/template-assets/<name>/metadata.json` で repo 管理し、local project の title は Rename で扱う。
- My Workspace の thumbnail 生成は、初回生成コスト、失敗時 fallback、再生成タイミング、localStorage 容量上限を確認する。
  問題が見えてから IndexedDB や thumbnail cache TTL を検討する。
- Workspace E2E 強化は今すぐはやらない。Designer / FormViewer / JSX / md2pdf 間の active project 読み込み、
  reset、blank template、schema なし template、mobile viewport は、仕様がもう少し固まってから固定する。
- Project import / export は Template JSON download だけで足りるか、inputs / source / metadata を含む
  workspace project export が必要かを見極める。

### 5. `md2pdf` assets / rich content 方針

- remote image は当面 link fallback のままにする。実装する場合は converter 内で安全に fetch して
  PNG / JPEG data URI 化する案を、CORS、content-type、size limit、timeout とセットで検討する。
- `Template + inputs` API は維持する。assets metadata や warnings は、必要になった時に追加検討する。
- table cell / list item 内の bold, italic, inline code, link を schema 拡張で保持するか、複数 schema に
  分解するかを後で決める。完璧な GFM より PDF として破綻しないことを優先する。

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
- `@pdfme/jsx` の `Document` は root component。`Page` は `Document` から `size`, `orientation`,
  `margin`, `font` を継承できる。`Header` / `Footer` は blank `basePdf.staticSchema` に変換されるが、
  座標系は `Document` の page margin 領域に合わせる。
- `Table` component の `columnWeights` は mm 指定ではなく相対 weight。pdfme の
  `headWidthPercentages` に正規化され、不足 / 不正な weight は `1` として扱う。
- text / MVT の `padding`, `borderWidth`, `borderColor` は table cell と共通の box helper で扱う。
  `overflow: "expand"` で行分割される場合は、左右の padding / border は各 chunk に残し、上辺は最初の
  chunk、下辺は最後の chunk だけに残す。
- text / MVT の background / padding / border は schema box の装飾として扱う。content が空でも
  background / border は描画される。

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
- GFM table の基本形は `table` schema に落とす。MVP では cell 内 rich inline content は plain text
  に落とし、装飾や link は保持しない。
- code block は `text` + background + padding + border で始める。等幅フォント、空白保持、長い行、
  syntax highlight、ページ分割を考えると専用 layout が欲しい。
- blockquote は `text` + background + left border + padding で始める。中に paragraph / list / code / table を持てる点に
  注意する。
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
- PR #1483: `@pdfme/converter/md2pdf` MVP。GFM paragraph / heading / list / table / code block /
  blockquote / horizontal rule / link / PNG-JPEG data URI image を `Template + inputs` に変換する
  subpath export を追加。pagination は generator dynamic layout に任せ、CJK / 日本語フォント導線も README
  とテストで固定。
- PR #1485: `md2pdf` default style 品質改善。table grid、code block background + padding、
  blockquote left rule、horizontal rule color などを調整し、text / MVT に `padding`, `borderWidth`,
  `borderColor` を追加して table cell と共通の box helper に寄せた。
- PR #1486: `/md2pdf` playground lab と converter docs を追加。Markdown editor / Viewer preview /
  PDF generation / render timing を同じ画面で試せるようにした。
- PR #1487: `/jsx` playground、共有 Monaco `CodeEditor`、Template JSON / `md2pdf` editor の Monaco 化、
  `@pdfme/jsx` beta docs を追加。JSX evaluation は Web Worker + Sucrase + restricted globals で扱う。
- PR #1488: `/jsx` / `/md2pdf` playground に sample preset 切り替え、JSX Form preview、
  Template JSON download、mobile preview sizing、JSX template validation、`Table columnWeights`
  docs / tests を追加。
- PR #1490: `/jsx` / `/md2pdf` playground の mobile preview refresh を修正。スクロールコンテナと
  zero-height preview の再マウント判定を調整。
- PR #1491: `@pdfme/jsx` static layout API を `Document` root に再設計。`Header` / `Footer` /
  `Static` は `Document` 直下に限定し、`Header` / `Footer` は page margin 領域、`Static` は page
  全体座標の repeated overlay として扱うようにした。
- PR #1492: `/jsx` playground で generated template を Designer に開ける導線を追加。編集の正は
  generated template / inputs とし、JSX source は初期生成用の seed として扱う方針にした。
- PR #1493: `getDynamicTemplate` が blank page `schemas: [[]]` を保持するようにし、入力 schema のない
  blank template も FormViewer で表示できるようにした。
- PR #1494: `/md2pdf` playground から Template JSON / Open Designer を外し、md2pdf は Markdown preview と
  PDF generation に絞る形へ戻した。
- PR #1495: Playground を Templates gallery / local project workspace に統合。Sample template、JSX starter、
  md2pdf starter、local project を共通カードで管理し、Designer / FormViewer / authoring playground へ
  project kind に応じて遷移できるようにした。template metadata / thumbnail 生成 / website redirect も整理。
- PR #1496: My Workspace project の Rename / Duplicate、Designer / FormViewer / JSX / md2pdf の
  Save As、project card の More menu、Designer toolbar の重なり修正を追加。
- PR #1503: JSX authoring starter を height-less authoring 方針に更新し、`jsx-research-paper` を追加。
  JSX / md2pdf starter source と metadata を `playground/public/template-assets/<name>/` に移し、
  generated `template.json` と同じ単位で管理できるようにした。

## 参考

- pdfme issue #319: HyperLink Schema の追加
  - https://github.com/pdfme/pdfme/issues/319
- pdfme issue #239: `generate` によって `basePdf` のリンクが消える問題
  - https://github.com/pdfme/pdfme/issues/239
- pdfme issue #851: text schema に padding / border options を追加する要望
  - https://github.com/pdfme/pdfme/issues/851
- pdf-lib issue #555: 低レベルなリンク annotation 実装についての議論
  - https://github.com/Hopding/pdf-lib/issues/555
- GFM spec
  - https://github.github.com/gfm/
