# JSX (beta)

`@pdfme/jsx` は、`Document`, `Page`, `Stack`, `Row`, `Box`, `Text`, `Table`, `Header`, `Footer`,
`Absolute` などの JSX component で pdfme template を作るための authoring layer です。

出力は通常の pdfme `Template` と `inputs` です。そのため、結果はいつもの `generate`, `Designer`,
`Form`, `Viewer` に、通常の plugins / fonts と一緒に渡せます。

[JSX playground](https://playground.pdfme.com/jsx) でブラウザ上から試せます。playground にはサンプル
プリセットがあり、preview は `Viewer` / `Form` を切り替えられます。

## インストール

```bash
npm install @pdfme/jsx
```

TypeScript で JSX を書く場合は JSX runtime を設定します。

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@pdfme/jsx"
  }
}
```

## 基本例

```tsx
import { generate } from '@pdfme/generator';
import { text, table } from '@pdfme/schemas';
import { Document, Page, Stack, Text, Table, renderToTemplate } from '@pdfme/jsx';

const { template, inputs } = await renderToTemplate(
  <Document size="A4" margin={{ x: 16, y: 18 }}>
    <Page>
      <Stack gap={6}>
        <Text size={24}>
          Invoice
        </Text>
        <Text color="#64748b">
          Generated from JSX, rendered by pdfme.
        </Text>
        <Table
          head={['Item', 'Qty', 'Price']}
          rows={[
            ['Design', 1, '$800'],
            ['Automation', 2, '$1,200'],
          ]}
        />
      </Stack>
    </Page>
  </Document>,
);

const pdf = await generate({
  template,
  inputs,
  plugins: { text, table },
});
```

## レイアウト component

- `Document` は共有 page 設定と繰り返し static content の root component です。
- `Page` は page を作ります。複数の `Page` は `template.schemas` の複数 page になります。
  `Document` 内の `Page` は、`size`, `orientation`, `margin`, `font` を `Document` から継承します。
- `Document` props は default であり、deep merge される style object ではありません。`Page` が
  `margin`, `size`, `orientation`, `font` を指定した場合、その prop は `Document` 側の値を置き換えます。
  生成される blank `basePdf.padding` は、最初に render される page の解決後 margin から作られます。
- `Stack` は縦方向、`Row` は横方向に children を並べます。
- `Box` は padding, background, border を持つ container です。
- `Spacer` は空白の layout space を作ります。
- `Header` / `Footer` は blank base PDF の top / bottom margin 領域に repeated static schema を作ります。
  `Static` は page 全体座標を使う低レベルな repeated overlay です。
- `Absolute` は badge, watermark, overlay などのための escape hatch です。flow には影響しません。

layout API は CSS/Flexbox 互換を目指していません。`gap`, `margin`, `alignItems`,
`justifyContent`, `flex` / `flexGrow` など、template authoring に必要な部分だけを小さく取り込んでいます。

`Text`, `MultiVariableText`, `List`, `Table` は通常 `height` を省略できます。JSX render 時に初期 content
を測定し、周囲の `Stack`, `Row`, `Box` を進めます。固定 field、固定 visual area、Form の入力 box を
明確にしたい場合だけ `height` を指定してください。`height` のない `Box` は、JSX render 時点では子要素の高さに
合わせて伸びます。

## schema component

`@pdfme/jsx` には、主要な static / form 向け schema component が含まれています。

- `Text`
- `MultiVariableText`
- `Image`
- `Svg`
- `Rectangle`
- `Ellipse`
- `Line`
- `List`
- `Table`

component に `name` がある場合は input-backed schema になり、`name` がない場合は read-only content として
描画されます。これは pdfme template のデータモデルに合わせた挙動です。

出力は通常の pdfme template なので、Designer で編集した内容は generated `Template` に反映されます。JSX は
初期生成 / 再生成のための authoring surface であり、Designer 編集後の template を lossless に JSX へ戻すものでは
ありません。

`Table` の `columnWeights` は相対的な列幅の重みです。値は pdfme の `headWidthPercentages` に正規化されるため、
`columnWeights={[30, 70]}` は `30mm` / `70mm` ではなく 30/70 の比率を意味します。不足している weight や不正な
weight は `1` として扱われるため、正確な比率が必要な場合は列数分の weight を指定してください。以前の beta build
では `widths` を使っていましたが、今後は `columnWeights` を使います。

## JSX playground beta

playground では full module ではなく function body を入力します。

```tsx
return (
  <Page>
    <Text>Hello from JSX</Text>
  </Page>
);
```

以前の beta static API から移行する場合は、`Header` / `Footer` / `Static` を `Page` の外に出し、
`Document` の direct child として置いてください。

現時点では playground 側が pdfme JSX component を evaluation scope に注入します。rendering は Web Worker
内で実行し、よく使われる browser global をブロックします。`import` / `export` 文にはまだ対応していません。
API が beta の間は、ブラウザ上の sandbox と module 解決を小さく保つ方針です。

繰り返し表示する content は、`Document` 直下に `Header` / `Footer` として書きます。

```tsx
return (
  <Document size="A4" margin={{ x: 16, y: 18 }}>
    <Header>
      <Text>Report</Text>
    </Header>
    <Footer>
      <Text align="right">
        {'Page {currentPage} of {totalPages}'}
      </Text>
    </Footer>
    <Page>
      <Text>Body</Text>
    </Page>
  </Document>
);
```

`Header` / `Footer` は margin-aware です。座標の基準は page margin 領域なので、title、page number、
繰り返し表示する document chrome に向いています。`Static` は page 全体座標を使う低レベル API で、
watermark、crop mark、stamp などの advanced overlay 向けです。

## 現在の制限

- `@pdfme/jsx` は beta です。component 名や layout の細部は今後調整される可能性があります。
- playground は信頼できる example と実験用です。信頼できない code の実行環境としては扱わないでください。
- CSS parser や React renderer ではありません。component は pdfme schema object を生成します。
- `flexWrap`, `flexShrink`, media query, CSS percentage など full Flexbox 機能は未対応です。
- 出力は `Template + inputs` です。実際の描画は通常通り pdfme plugins, fonts, generator/viewer options に依存します。
- `Header`, `Footer`, `Static` は `Document` の direct child としてのみ使えます。これらは blank
  `basePdf.staticSchema` を生成するため、custom PDF `basePdf` とは併用できません。
- Form 入力によって runtime に text / MVT が expand した場合、親 `Box` の rectangle はまだ自動では
  再計算されません。親子 container の dynamic reflow は今後の layout 機能として扱います。
