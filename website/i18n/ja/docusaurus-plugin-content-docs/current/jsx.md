# JSX (beta)

`@pdfme/jsx` は、`Page`, `Stack`, `Row`, `Box`, `Text`, `Table`, `Header`, `Footer`,
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
import { Page, Stack, Text, Table, renderToTemplate } from '@pdfme/jsx';

const { template, inputs } = await renderToTemplate(
  <Page size="A4" margin={{ x: 16, y: 18 }}>
    <Stack gap={6}>
      <Text height={12} size={24}>
        Invoice
      </Text>
      <Text height={8} color="#64748b">
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
  </Page>,
);

const pdf = await generate({
  template,
  inputs,
  plugins: { text, table },
});
```

## レイアウト component

- `Page` は page を作ります。複数の `Page` は `template.schemas` の複数 page になります。
- `Stack` は縦方向、`Row` は横方向に children を並べます。
- `Box` は padding, background, border を持つ container です。
- `Spacer` は空白の layout space を作ります。
- `Header`, `Footer`, `Static` は blank base PDF の static schema を作ります。
- `Absolute` は badge, watermark, overlay などのための escape hatch です。flow には影響しません。

layout API は CSS/Flexbox 互換を目指していません。`gap`, `margin`, `alignItems`,
`justifyContent`, `flex` / `flexGrow` など、template authoring に必要な部分だけを小さく取り込んでいます。

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

現時点では playground 側が pdfme JSX component を evaluation scope に注入します。rendering は Web Worker
内で実行し、よく使われる browser global をブロックします。`import` / `export` 文にはまだ対応していません。
API が beta の間は、ブラウザ上の sandbox と module 解決を小さく保つ方針です。

## 現在の制限

- `@pdfme/jsx` は beta です。component 名や layout の細部は今後調整される可能性があります。
- playground は信頼できる example と実験用です。信頼できない code の実行環境としては扱わないでください。
- CSS parser や React renderer ではありません。component は pdfme schema object を生成します。
- `flexWrap`, `flexShrink`, media query, CSS percentage など full Flexbox 機能は未対応です。
- 出力は `Template + inputs` です。実際の描画は通常通り pdfme plugins, fonts, generator/viewer options に依存します。
