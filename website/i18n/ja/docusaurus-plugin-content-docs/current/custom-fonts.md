# カスタムフォント

pdfmeはデフォルトで[Roboto Regular 400](https://fonts.google.com/specimen/Roboto)フォントを使用していますが、お好きなフォントを使用することができます。

デザインを優先する場合は、お気に入りのフォントを使用できます。また、日本語や中国語などのデフォルトのRobotoフォントに含まれていない文字を使用している場合、PDFでは[豆腐（Tofu）](https://fonts.google.com/knowledge/glossary/tofu)として表示されます。

この機能を使用して、これらの問題を解決することができます。

## フォントタイプについて

以下のように`@pdfme/common`からインポートできます。

```ts
import type { Font } from '@pdfme/common';
```

フォントの型は以下の通りです。

```ts
type Font = {
  [fontName: string]: {
    data: string | Uint8Array | ArrayBuffer;
    fallback?: boolean;
    subset?: boolean;
  };
};
```
- `data`: `http`で始まる`string`を登録すると、自動的にフェッチされます。または、`Uint8Array | ArrayBuffer`のようなバイナリデータを直接設定します。
- \*`fallback`: trueに設定すると、`fontName`が設定されていない場合に使用するフォントになります。**フォントオブジェクトのうち1つだけをtrueに設定する必要があります。**
- \*`subset`: デフォルトはtrueですが、フォント埋め込みをサブセットにしないようにfalseに設定できます。（この設定は、特定のフォントをサブセットで埋め込む際のfontkitのバグに対応するためのものです。）

```ts
const font: Font = {
  serif: {
    data: 'https://example.com/fonts/serif.ttf',
    fallback: true,
  },
  sans_serif: {
    data: 'https://example.com/fonts/sans_serif.ttf',
  },
};
```

## フォントの設定方法

ジェネレーターとUIパッケージでフォントを設定する方法を見てみましょう。

### ジェネレーター

[generate](/docs/getting-started#generator)関数のオプションとしてフォントを設定します。

```ts
import { Template, BLANK_PDF, Font } from '@pdfme/common';
import { generate } from '@pdfme/generator';

const font: Font = {
  serif: {
    data: 'https://example.com/fonts/serif.ttf',
    fallback: true,
  },
  sans_serif: {
    data: 'https://example.com/fonts/sans_serif.ttf',
  },
};
const template: Template = {
  basePdf: BLANK_PDF,
  schemas: [
    [
      {
        name: 'a',
        type: 'text',
        fontName: 'serif',
        position: { x: 0, y: 0 },
        width: 10,
        height: 10,
      },
      {
        name: 'b',
        type: 'text',
        fontName: 'sans_serif',
        position: { x: 10, y: 10 },
        width: 10,
        height: 10,
      },
      {
        // <- フォールバックフォントを使用（serif）
        name: 'c',
        type: 'text',
        position: { x: 20, y: 20 },
        width: 10,
        height: 10,
      },
    ],
  ],
};
const inputs = [{ a: 'a1', b: 'b1', c: 'c1' }];

generate({ template, inputs, options: { font } }).then((pdf) => {
  console.log(pdf);

  // ブラウザ
  // const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
  // window.open(URL.createObjectURL(blob));

  // Node.js
  // fs.writeFileSync(path.join(__dirname, `test.pdf`), pdf);
});
```

### UI

UIでフォントを設定する方法は2つあります。インスタンス初期化時と、メソッドを通じての設定です。  
サンプルコードは[デザイナー](/docs/getting-started#designer)用ですが、同じ方法で[フォーム](/docs/getting-started#form)と[ビューワー](/docs/getting-started#viewer)にも使用できます。

#### インスタンス初期化時にフォントを設定

```ts
import { Designer } from '@pdfme/ui';

const domContainer = document.getElementById('container');
const template = {
  // 省略...
};
const font = {
  serif: {
    data: 'https://example.com/fonts/serif.ttf',
    fallback: true,
  },
  sans_serif: {
    data: 'https://example.com/fonts/sans_serif.ttf',
  },
};

const designer = new Designer({ domContainer, template, options: { font } });
```

#### `updateOptions`でフォントを更新

```ts
const font = {
  serif: {
    data: 'https://example.com/fonts/serif.ttf',
  },
  sans_serif: {
    data: 'https://example.com/fonts/sans_serif.ttf',
    fallback: true,
  },
};
designer.updateOptions({ font });
```
