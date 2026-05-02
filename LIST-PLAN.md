# List Schema Implementation Plan

このドキュメントは、PDFme に新しい `list` スキーマを追加するための実装計画です。

目的は、単なる固定高さの箇条書きではなく、`table` と同じように以下をサポートすることです。

- 入力データに応じた dynamic height
- blank `basePdf` での自動改ページ
- List の高さ変化による後続 schema の押し下げ
- PDF / UI / Designer / Form / Viewer で一貫した見た目

実装方針としては、List 自体は `text` schema の拡張として実装し、dynamic layout は現在 `table` 専用になっている処理を schema-neutral に一般化します。

## 現状整理

### Plugin 構造

PDFme の schema は `Plugin` として実装されます。

```ts
interface Plugin<T extends Schema = Schema> {
  pdf(arg: PDFRenderProps<T & Schema>): Promise<void> | void;
  ui(arg: UIRenderProps<T & Schema>): Promise<void> | void;
  propPanel: PropPanel<T & Schema>;
  icon?: string;
  uninterruptedEditMode?: boolean;
}
```

参照先:

- `packages/common/src/types.ts`
- `packages/schemas/src/text/index.ts`
- `packages/schemas/src/multiVariableText/index.ts`
- `packages/schemas/src/tables/index.ts`

`Schema` は `zod` 的には `.passthrough()` なので、List 固有プロパティを common の `Schema` にすべて追加する必要はありません。ただし、共通の内部メタデータとして使う `__splitRange` は common に明示追加してもよいです。

### builtInPlugins は変更しない

`packages/schemas/src/builtins.ts` は意図的に `Text` だけを default built-in としています。

```ts
const builtInPlugins = { Text: text };
```

List を追加しても、ここには含めない方針が現在の設計に合います。利用者は以下のように明示的に渡します。

```ts
import { list } from '@pdfme/schemas';

new Designer({
  domContainer,
  template,
  plugins: { List: list },
});

generate({
  template,
  inputs,
  plugins: { List: list },
});
```

### dynamic layout の現状

現在の dynamic layout は大きく2つに分かれています。

1. `@pdfme/common` の `getDynamicTemplate`
   - 各 schema の高さ配列を受け取り、ページに詰め直す
   - schema をページごとに分割する
   - 後続 schema を押し下げる

2. `@pdfme/schemas/tables` の `getDynamicHeightsForTable`
   - table の row ごとの高さを返す
   - header repeat も考慮する

呼び出し側は現在 `table` を直接 switch しています。

```ts
getDynamicHeights: (value, args) => {
  switch (args.schema.type) {
    case 'table':
      return getDynamicHeightsForTable(value, args);
    default:
      return Promise.resolve([args.schema.height]);
  }
}
```

該当箇所:

- `packages/generator/src/generate.ts`
- `packages/ui/src/components/Preview.tsx`

問題は、`getDynamicTemplate` の分割処理が `table` の header/body 前提を持っていることです。

- `__bodyRange` を common 側で直接付けている
- `dynamicHeights[0] = header row` という前提がコメントとロジックにある
- 「header だけをページ末尾に残さない」処理が List には不要

List 対応では、この table 専用知識を common から外します。

## 実装ゴール

### MVP の機能

List schema は以下をサポートします。

- `bullet` list
- `ordered` list
- newline 文字列入力
- JSON string array 入力
- generator では実配列入力も許容
- item 単位の dynamic height
- item 単位の改ページ
- split 後も ordered list の番号が継続する
- marker と本文の hanging indent

### 初期スコープ外

以下は初期実装では避けるのが安全です。

- 1つの item の途中で行単位に改ページする
- nested list
- rich text / inline markdown との統合
- checkbox list
- List の AcroForm 対応
- rotated dynamic list
- `dynamicFontSize` との併用

特に「1 item が1ページを超える」ケースは、初期実装では table の巨大 row と同じ扱いにしてよいです。つまり、1 item を強制配置し、ページから溢れる可能性を許容します。

## 推奨ファイル構成

新規追加:

```txt
packages/schemas/src/list/index.ts
packages/schemas/src/list/types.ts
packages/schemas/src/list/constants.ts
packages/schemas/src/list/helper.ts
packages/schemas/src/list/pdfRender.ts
packages/schemas/src/list/uiRender.ts
packages/schemas/src/list/propPanel.ts
packages/schemas/src/list/dynamicTemplate.ts
packages/schemas/src/lists.ts
packages/schemas/__tests__/list.test.ts
```

変更:

```txt
packages/common/src/types.ts
packages/common/src/schema.ts
packages/common/src/dynamicTemplate.ts
packages/common/__tests__/dynamicTemplate.test.ts

packages/schemas/src/index.ts
packages/schemas/package.json

packages/generator/src/generate.ts
packages/ui/src/components/Preview.tsx
packages/ui/src/i18n.ts
packages/common/src/schema.ts

playground/src/plugins/index.ts

packages/cli/src/diagnostics.ts
website/docs/cli.md
website/docs/supported-features.md
```

`packages/schemas/src/builtins.ts` は変更しません。

## List Schema の型

`TextSchema` を継承します。

```ts
import type { TextSchema } from '../text/types.js';

export type LIST_STYLE = 'bullet' | 'ordered';

export type ListRange = {
  start: number; // inclusive
  end?: number; // exclusive
};

export type ListSchema = TextSchema & {
  listStyle: LIST_STYLE;

  // bullet list の marker。デフォルトは "\u2022"。
  marker?: string;

  // ordered list の開始番号。デフォルトは 1。
  startNumber?: number;

  // ordered list の suffix。デフォルトは "."。
  orderedSuffix?: string;

  // marker column の幅、mm。
  markerWidth: number;

  // marker と本文の間隔、mm。
  markerGap: number;

  // item 間の追加余白、mm。
  itemSpacing: number;

  // split 後にその schema が描画する item range。
  __itemRange?: ListRange;
};
```

初期値の例:

```ts
defaultSchema: {
  ...parentTextPropPanel.defaultSchema,
  type: 'list',
  content: JSON.stringify(['First item', 'Second item']),
  width: 80,
  height: 20,
  listStyle: 'bullet',
  marker: '\u2022',
  startNumber: 1,
  orderedSuffix: '.',
  markerWidth: 6,
  markerGap: 2,
  itemSpacing: 1,
  dynamicFontSize: undefined,
  verticalAlignment: 'top',
}
```

`dynamicFontSize` は初期実装では propPanel から外すか disabled にします。dynamic height は「文字サイズを固定し、高さを増やす」設計のため、box に収める `dynamicFontSize` とは思想が衝突します。

## 入力形式

List は以下を受けられるようにします。

```ts
// generator input
{ tasks: ['Install deps', 'Run tests'] }

// JSON string array
{ tasks: '["Install deps","Run tests"]' }

// newline string
{ tasks: 'Install deps\nRun tests' }
```

helper で正規化します。

```ts
export const normalizeListItems = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((item) => String(item));

  if (typeof value !== 'string') {
    return value == null ? [] : [String(value)];
  }

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.map((item) => String(item));
  } catch {
    // Fall through to newline parsing.
  }

  return value.split(/\r\n|\r|\n/g);
};
```

注意点:

- `generate` 側は `input[name]` を string cast して renderer に渡している箇所があるため、実配列入力を完全に活かすなら `value` の型を見直す余地があります。
- 最小変更では、generator 内で `String(input[name] || '')` された値も `normalizeListItems` で扱えるようにします。
- 実配列が `String(array)` されると `"a,b"` になり、item 分割できません。正式に配列入力をサポートするなら `PDFRenderProps.value` の型拡張、または generator の value 取得ロジック改善が必要です。

推奨は、List 実装時に `PDFRenderProps.value` / `UIRenderProps.value` をすぐ広げるのではなく、まず List の documented input を JSON string array と newline string にすることです。generator の実配列対応は別 PR でもよいです。

## List layout helper

PDF、UI、dynamic height が同じ計算を使うように、List item の layout 計算は helper に集約します。

```ts
type ListItemLayout = {
  item: string;
  itemIndex: number;
  marker: string;
  lines: string[];
  height: number; // mm
};

type ListLayout = {
  items: ListItemLayout[];
  totalHeight: number;
  markerWidth: number;
  markerGap: number;
  bodyWidth: number;
};
```

計算方針:

1. `schema.width - markerWidth - markerGap` を body width とする
2. text helper の `splitTextToSize` を使って item を行に分割する
3. `lineHeightMm = pt2mm(fontSize * lineHeight)` を基準に高さ計算する
4. `itemHeight = max(lineCount, 1) * lineHeightMm + itemSpacing`
5. 最終 item には `itemSpacing` を足さない、または全 item に足す方針を統一する

table の cell height は `lineCount * lineHeight + padding` に近い計算です。List も PDF/UI/dynamic で同じ helper を使うことでズレを避けます。

ordered list の marker は split range を考慮します。

```ts
const getOrderedMarker = (schema: ListSchema, absoluteIndex: number) => {
  const startNumber = schema.startNumber ?? 1;
  const suffix = schema.orderedSuffix ?? '.';
  return `${startNumber + absoluteIndex}${suffix}`;
};
```

## PDF render

`pdfRender.ts` は item ごとに marker と body を別々に描画します。

方針:

- marker は `schema.position.x`
- body は `schema.position.x + markerWidth + markerGap`
- body width は `schema.width - markerWidth - markerGap`
- body の折り返しは helper の layout 計算結果を使う
- text rendering 自体は可能な限り `text` の `pdfRender` を再利用する

疑似コード:

```ts
export const pdfRender = async (arg: PDFRenderProps<ListSchema>) => {
  const { schema, value } = arg;
  const items = normalizeListItems(value || schema.content || '');
  const range = schema.__itemRange ?? { start: 0, end: items.length };
  const visibleItems = items.slice(range.start, range.end);

  const layout = await calculateListLayout({
    schema,
    items: visibleItems,
    startIndex: range.start,
    options: arg.options,
    _cache: arg._cache,
  });

  let y = schema.position.y;
  for (const item of layout.items) {
    await textPdfRender({
      ...arg,
      value: item.marker,
      schema: {
        ...schema,
        type: 'text',
        position: { x: schema.position.x, y },
        width: schema.markerWidth,
        height: item.height,
        backgroundColor: '',
        alignment: 'right',
        verticalAlignment: 'top',
      },
    });

    await textPdfRender({
      ...arg,
      value: item.item,
      schema: {
        ...schema,
        type: 'text',
        position: {
          x: schema.position.x + schema.markerWidth + schema.markerGap,
          y,
        },
        width: schema.width - schema.markerWidth - schema.markerGap,
        height: item.height,
        backgroundColor: '',
        alignment: schema.alignment,
        verticalAlignment: 'top',
      },
    });

    y += item.height;
  }
};
```

この方法だと、フォント埋め込み、禁則処理、色、opacity、underline など text 側の資産を活かせます。

ただし、item ごとに `textPdfRender` を2回呼ぶため、大量 item では少しコストがあります。必要なら後から低レベル描画に最適化できます。

## UI render

`uiRender.ts` は以下を満たします。

- viewer は PDF に近い見た目
- form/designer では編集可能
- 編集後に `content` を更新
- 高さが変わったら `onChange({ key: 'height', value: nextHeight })`

table は UI render の最後で schema height を更新しています。List も同じ考え方でよいです。

```ts
if (schema.height !== layout.totalHeight && onChange) {
  onChange({ key: 'height', value: layout.totalHeight });
}
```

編集 UI は初期実装では newline text として扱うのが簡単です。

- viewer: item DOM を marker/body の2カラムで描画
- form/designer: contenteditable な plaintext block にして、blur 時に newline string を保存

より List らしい編集体験にするなら item ごとに contenteditable を分けますが、初期実装は複雑になります。

## propPanel

`multiVariableText` と同じように `text` の propPanel を再利用し、List 固有項目を追加します。

追加する項目:

- `listStyle`: `bullet` / `ordered`
- `marker`: bullet marker
- `startNumber`: ordered list の開始番号
- `orderedSuffix`
- `markerWidth`
- `markerGap`
- `itemSpacing`

非表示または disabled にしたい項目:

- `dynamicFontSize`
- `verticalAlignment`
- 必要なら `formatter`

`text` propPanel の schema は関数なので、既存のように parent schema を呼び出します。

```ts
const parentSchema =
  typeof parentPropPanel.schema === 'function'
    ? parentPropPanel.schema(propPanelProps)
    : {};
```

## dynamic layout 一般化

ここが一番重要です。

現在の common `getDynamicTemplate` は、分割後 schema に `__bodyRange` を直接付けています。これは table 専用です。List 対応では common が table/list を知らないようにします。

### 追加する共通型

`packages/common/src/types.ts` に追加します。

```ts
export type DynamicLayoutPatchArgs = {
  schema: Schema;
  start: number; // inclusive unit index
  end: number; // exclusive unit index
  isSplit: boolean;
  chunkHeight: number;
};

export type DynamicLayoutResult = {
  heights: number[];

  // table の header-only page 回避用。
  // List は false。
  avoidFirstUnitOnly?: boolean;

  // schema 固有の split metadata を付ける。
  patchSplitSchema?: (args: DynamicLayoutPatchArgs) => Partial<Schema>;
};

export type GetDynamicLayout = (
  value: string,
  args: {
    schema: Schema;
    basePdf: BasePdf;
    options: CommonOptions;
    _cache: Map<string | number, unknown>;
  },
) => Promise<DynamicLayoutResult>;
```

互換性を重視するなら、移行期間だけ `number[]` も受けられるようにします。

```ts
type DynamicLayoutCallbackResult = DynamicLayoutResult | number[];

const normalizeDynamicLayoutResult = (
  result: DynamicLayoutCallbackResult,
): DynamicLayoutResult => {
  if (Array.isArray(result)) return { heights: result };
  return result;
};
```

### getDynamicTemplate の変更

`LayoutItem` は `dynamicHeights` ではなく `dynamicLayout` を持つようにします。

```ts
interface LayoutItem {
  schema: Schema;
  baseY: number;
  height: number;
  dynamicLayout: DynamicLayoutResult;
}
```

`placeRowsOnPages` は `placeUnitsOnPages` のような名前に変えて、table row 前提を消します。

```ts
function placeUnitsOnPages(
  schema: Schema,
  dynamicLayout: DynamicLayoutResult,
  startGlobalY: number,
  contentHeight: number,
  paddingTop: number,
  pages: Schema[][],
): number {
  const dynamicHeights = dynamicLayout.heights;
  ...
}
```

現在の header-only 回避ロジックは List には不要です。必ず `dynamicLayout.avoidFirstUnitOnly` が true のときだけ動かします。

```ts
if (
  dynamicLayout.avoidFirstUnitOnly &&
  isSplittable &&
  startUnitIndex === 0 &&
  currentUnitIndex === 1 &&
  dynamicHeights.length > 1 &&
  !isAtPageTop
) {
  currentUnitIndex = 0;
  currentPageIndex++;
  currentYInPage = 0;
  continue;
}
```

分割後 schema は common が `height` と `position` を決め、schema 固有 metadata は `patchSplitSchema` に任せます。

```ts
const patch = dynamicLayout.patchSplitSchema?.({
  schema,
  start: startUnitIndex,
  end: currentUnitIndex,
  isSplit: startUnitIndex > 0,
  chunkHeight,
}) ?? {};

const newSchema: Schema = {
  ...schema,
  ...patch,
  height: chunkHeight,
  position: { ...schema.position, y: currentYInPage + paddingTop },
};
```

`height` と `position` は common が最後に上書きする方が安全です。schema 側 patch が layout core を壊さないためです。

### table helper の移行

既存の `getDynamicHeightsForTable` は互換 export として残しつつ、新しい `getDynamicLayoutForTable` を追加します。

```ts
export const getDynamicLayoutForTable = async (
  value: string,
  args: DynamicLayoutArgs,
): Promise<DynamicLayoutResult> => {
  const heights = await getDynamicHeightsForTable(value, args);

  return {
    heights,
    avoidFirstUnitOnly: true,
    patchSplitSchema: ({ start, end, isSplit }) => ({
      __splitRange: { start, end },
      __bodyRange: {
        start: start === 0 ? 0 : start - 1,
        end: end - 1,
      },
      __isSplit: isSplit,
    }),
  };
};
```

table の `__bodyRange` は既存 renderer が使っているため残します。新しく `__splitRange` も付けておくと、将来の共通化に役立ちます。

注意:

- `__bodyRange.end` は `Array.prototype.slice(start, end)` の end として使われるため exclusive です。
- `__splitRange.end` も exclusive に統一します。

### list dynamic helper

`packages/schemas/src/list/dynamicTemplate.ts` に追加します。

```ts
export const getDynamicLayoutForList = async (
  value: string,
  args: DynamicLayoutArgs,
): Promise<DynamicLayoutResult> => {
  if (args.schema.type !== 'list') {
    return { heights: [args.schema.height] };
  }

  const schema = args.schema as ListSchema;
  const items = normalizeListItems(value || schema.content || '');
  const layout = await calculateListLayout({
    schema,
    items,
    startIndex: 0,
    options: args.options,
    _cache: args._cache,
  });

  return {
    heights: layout.items.map((item) => item.height),
    avoidFirstUnitOnly: false,
    patchSplitSchema: ({ start, end, isSplit }) => ({
      __splitRange: { start, end },
      __itemRange: { start, end },
      __isSplit: isSplit,
    }),
  };
};
```

## generator / UI integration

### 最小変更

まずは現在の switch に `list` を追加します。

`packages/generator/src/generate.ts`:

```ts
import { getDynamicLayoutForTable } from '@pdfme/schemas/tables';
import { getDynamicLayoutForList } from '@pdfme/schemas/lists';

getDynamicLayout: (value, args) => {
  switch (args.schema.type) {
    case 'table':
      return getDynamicLayoutForTable(value, args);
    case 'list':
      return getDynamicLayoutForList(value, args);
    default:
      return Promise.resolve({ heights: [args.schema.height] });
  }
}
```

`packages/ui/src/components/Preview.tsx` も同様です。

また、Form で content 更新後に再レイアウトが必要な schema type に `list` を追加します。

```ts
if (schema.type === 'table' || schema.type === 'list') {
  isNeedInit = true;
  newInputValue = newValue;
}
```

### 将来的な推奨

さらに綺麗にするなら `Plugin` に optional な dynamic layout hook を追加します。

```ts
interface Plugin<T extends Schema = Schema> {
  pdf(...): Promise<void> | void;
  ui(...): Promise<void> | void;
  propPanel: PropPanel<T & Schema>;
  icon?: string;
  uninterruptedEditMode?: boolean;
  dynamicLayout?: GetDynamicLayout;
}
```

この形にすると、generator/ui は `schema.type` の switch を持たずに plugin registry から解決できます。

```ts
const plugin = pluginsRegistry.findByType(args.schema.type);
return plugin?.dynamicLayout
  ? plugin.dynamicLayout(value, args)
  : Promise.resolve({ heights: [args.schema.height] });
```

ただし、これは `Plugin` interface の拡張になるため、まずは最小変更で switch を追加し、後続 PR で `Plugin.dynamicLayout` 化してもよいです。

## package exports

`packages/schemas/src/index.ts`:

```ts
import list from './list/index.js';

export {
  list,
};

export { getDynamicLayoutForList } from './lists.js';
```

`packages/schemas/src/lists.ts`:

```ts
export { getDynamicLayoutForList } from './list/dynamicTemplate.js';
```

`packages/schemas/package.json`:

```json
{
  "exports": {
    "./lists": {
      "types": "./dist/lists.d.ts",
      "import": "./dist/lists.js",
      "default": "./dist/lists.js"
    }
  }
}
```

既存の `./tables` export は維持します。table 側に `getDynamicLayoutForTable` を追加するなら `./tables` から export します。

## CLI 対応

`packages/cli/src/schema-plugins.ts` は `@pdfme/schemas` export を再帰的に見て plugin を集めているため、`list` を `packages/schemas/src/index.ts` から export すれば schema type としては認識されます。

ただし、`inputHints` は `packages/cli/src/diagnostics.ts` で type ごとに期待入力を作っています。List 用に追加します。

```ts
if (type === 'list') {
  return {
    name: schema.name as string,
    type,
    pages: [page],
    required: schema.required === true,
    expectedInput: {
      kind: 'stringArray',
      example: ['First item', 'Second item'],
      acceptsJsonString: true,
    },
  };
}
```

現状 `expectedInput.kind` に `stringArray` がない場合は、型定義、validation、エラーメッセージも追加します。小さく済ませるなら `kind: 'string'` にして docs だけ補足する方法もありますが、List を正式 schema にするなら hint も追加した方がよいです。

## i18n

List の propPanel label を i18n 化する場合、`Dict` にキーを追加する必要があります。

`packages/common/src/schema.ts`:

```ts
'schemas.list.style': z.string(),
'schemas.list.bullet': z.string(),
'schemas.list.ordered': z.string(),
'schemas.list.marker': z.string(),
'schemas.list.startNumber': z.string(),
'schemas.list.orderedSuffix': z.string(),
'schemas.list.markerWidth': z.string(),
'schemas.list.markerGap': z.string(),
'schemas.list.itemSpacing': z.string(),
```

`packages/ui/src/i18n.ts` には全 supported language 分を追加します。

初期実装では英語を基準にし、他言語は既存の翻訳品質に合わせて短い訳語を入れます。

## Playground

`playground/src/plugins/index.ts`:

```ts
import { list } from '@pdfme/schemas';

export const getPlugins = () => ({
  ...
  List: list,
});
```

動作確認用に template asset を追加するなら、以下のようなケースがあると便利です。

- 短い bullet list
- 長い item を含む list
- ordered list
- 2ページ以上にまたがる list
- list の下に text schema を置き、押し下げられることを確認

## テスト計画

### schemas unit tests

`packages/schemas/__tests__/list.test.ts`

テストすること:

- `normalizeListItems`
  - JSON string array
  - newline string
  - empty string
  - non-string value
- ordered marker
  - default start number
  - custom start number
  - split range start を反映
- layout calculation
  - item 数と height 数が一致
  - long item が複数行になる
  - itemSpacing が反映される

### common dynamicTemplate tests

`packages/common/__tests__/dynamicTemplate.test.ts`

追加すること:

- `patchSplitSchema` が分割後 schema に適用される
- `height` と `position` は common が最終決定する
- `avoidFirstUnitOnly: true` の場合、table header-only 回避が維持される
- `avoidFirstUnitOnly: false` の場合、List の first item だけがページ末尾に置ける
- `__splitRange` が inclusive/exclusive で正しく付く

特に `avoidFirstUnitOnly` のテストは重要です。既存の table 前提ロジックをそのまま List に適用すると、ページ末尾に1 item だけ入るケースで不自然に次ページ送りされます。

### generator tests

以下を追加します。

- dynamic list が1ページ内で高さを変える
- long list が複数ページに分割される
- ordered list の番号が split 後も継続する
- list の後続 text schema が押し下げられる

image snapshot を追加する場合:

- bullet list 1ページ
- ordered list 2ページ
- list + following text

### UI tests

`packages/ui` 側では以下を確認します。

- Designer sidebar に List が出る
- Renderer が viewer/form/designer で落ちない
- Form 編集後に `Preview` の `init` が再実行される
- `schema.height` が UI render 後に更新される

### CLI tests

CLI の input hints を正式対応するなら:

- `validate` が list schema を認識する
- list の expected input hint が返る
- JSON string array を valid とする
- 不正な input shape の message がわかりやすい

## 実装順序

推奨順です。

1. common の dynamic layout 一般化
   - `DynamicLayoutResult` を追加
   - `getDynamicTemplate` の table 専用 range 付与を `patchSplitSchema` に移す
   - `avoidFirstUnitOnly` を追加
   - table の既存テストを通す

2. table helper を新形式へ移行
   - `getDynamicLayoutForTable` を追加
   - `getDynamicHeightsForTable` は互換 export として残す
   - generator/ui の table 呼び出しを新形式に変更

3. List schema を固定 height で追加
   - `pdf/ui/propPanel/helper` を実装
   - `text` renderer/helper を再利用
   - playground に表示

4. List dynamic layout を追加
   - `getDynamicLayoutForList`
   - `generator/src/generate.ts`
   - `ui/src/components/Preview.tsx`
   - form edit 後の再レイアウト条件

5. docs / CLI / snapshots
   - supported features
   - CLI input hints
   - playground sample
   - generator image snapshots

6. optional: `Plugin.dynamicLayout`
   - switch をなくす
   - dynamic schema 追加時に generator/ui を触らない設計へ移行

## リスクと注意点

### PDF と UI の高さズレ

List は折り返し行数が高さに直結します。PDF と UI で別々に CSS wrapping と pdf-lib wrapping を使うとズレます。

対策:

- `calculateListLayout` を PDF/UI/dynamic の共通 helper にする
- UI も可能なら helper の行分割結果に近い DOM を作る
- snapshot test を追加する

### 1 item がページより高い場合

初期実装では item 単位の分割なので、1 item がページ content height を超える場合は溢れます。

対策:

- 初期仕様として明記する
- 将来 `__itemRange` + `__lineRange` で行単位 split を検討する

### ordered list の番号継続

split page では `__itemRange.start` を marker 計算に使います。

```ts
number = (schema.startNumber ?? 1) + absoluteItemIndex;
```

### `dynamicFontSize`

dynamic height と `dynamicFontSize` は同時に使わない方が安全です。List propPanel では非表示または disabled にします。

### custom PDF base

現在の dynamic template は blank `basePdf` のときだけ動きます。custom PDF base では `getDynamicTemplate` は元 template を返します。

List も table と同じく、改ページや後続要素の押し下げには blank `basePdf` が必要です。

### 既存 template 互換

新 schema type なので既存 template への破壊的影響は小さいです。

ただし common dynamicTemplate を変更するため、table の既存 snapshot と dynamicTemplate unit tests は必ず確認します。

## 完了条件

最低限、以下が満たされれば List schema は実用状態です。

- `@pdfme/schemas` から `list` を import できる
- Designer で List を追加できる
- PDF generation で List が描画される
- newline / JSON string array 入力で描画される
- 長い List が複数ページに分割される
- 分割後の ordered list 番号が継続する
- List 下の schema が押し下げられる
- table の既存 dynamic behavior が壊れていない
- `npm run test -w packages/common`
- `npm run test -w packages/schemas`
- `npm run test -w packages/generator`
- 必要に応じて `npm run test -w packages/ui`

