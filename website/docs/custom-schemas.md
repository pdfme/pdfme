# Custom Schemas

:::caution
This feature is still in beta and has not yet been released to npm.  
If you encounter bugs, issues, or have suggestions, please report them through [GitHub](https://github.com/pdfme/pdfme/issues/new/choose).

\*The specifications may change in future versions.  
:::

By default, pdfme allows you to use a text schema. However, some users may want to utilize schemas for images or QR codes.
These can be loaded as plugins from the `@pdfme/schemas` package.

You can also create your own schemas and load them similarly as plugins.
This page explains how to use schemas from `@pdfme/schemas` and how to create your own.

## Using Schemas from @pdfme/schemas

Here, we explain how to import image and QR code schemas from `@pdfme/schemas`.

First, install `@pdfme/schemas`.

```bash
npm install @pdfme/schemas
```

Next, import the required schemas from `@pdfme/schemas` to `@pdfme/generator` and `@pdfme/ui`.

The following code shows an example of importing QR code and image schemas from `@pdfme/generator` and `@pdfme/ui`.

```ts
import type { Template } from '@pdfme/common';
import { text, image, barcodes } from '@pdfme/schemas';
import { generate } from '@pdfme/generator';

const template: Template = {
  // skip... you can use text, image, qrcode schema type in template.
};
const inputs = [
  // skip...
];

const pdf = await generate({
  template,
  inputs,
  // ↓ You can use plugins in Generator like this.
  plugins: {
    text,
    image,
    qrcode: barcodes.qrcode,
  },
});
```

In this `@pdfme/ui` example, we're using the Designer, but you can load plugins in the Form and Viewer in the same way.

```ts
import type { Template } from '@pdfme/common';
import { text, image, barcodes } from '@pdfme/schemas';
import { Designer } from '@pdfme/ui';

const domContainer = document.getElementById('container');
const template: Template = {
  // skip... you can use text, image, qrcode schema type in template.
};

const designer = new Designer({
  domContainer,
  template,
  // ↓ You can use plugins in Designer like this.
  plugins: {
    text,
    image,
    qrcode: barcodes.qrcode,
  },
});
```

By loading image and qrcode as plugins, you can render schemas of type image and qrcode found in your template's schemas.

### Tips

Using plugins, you can override the default schema to remove text, replace it with custom schema, or rearrange the order.

```ts
const designer = new Designer({
  domContainer,
  template,
  // ↓ You can remove text schema and rearrange the order(1st: qrcode, 2nd: image) like this.
  plugins: {
    qrcode: barcodes.qrcode,
    image,
  },
});
```

![](/img/custom-schemas-tips.png)

## Creating Your Own Schemas

次に独自のスキーマを作成したい人向けに、その方法を紹介する。  
スキーマを作ったり、スキーマのアイデアがある人は [GitHub Discussions](https://github.com/pdfme/pdfme/discussions/288) で教えてください。  
pdfme はオープンソースで開発されているため、みんなでスキーマをシェアしたり、開発したりすることができるはずだと考えている。

### カスタムスキーマ / プラグイン の概要

カスタムスキーマは３つの要素で構成されており、それらをまとめてプラグインと呼んでいる。  
プラグインとそれの型定義は [packages/common/src/types.ts](https://github.com/pdfme/pdfme/blob/main/packages/common/src/types.ts) ファイル内に定義されている。

**Plugin** がどのように構成され、どのように動作するかを説明する。

- **pdf**: `@pdfme/generator`で使用され、PDF にスキーマをレンダリングするための処理を書く。PDF に描画する処理は [pdf-lib](https://pdf-lib.js.org/) で行っている。
- **ui**: `@pdfme/ui`で DOM にスキーマをレンダリングする処理を書く。ui には下記のモードがある。
  - **viewer**: [Viewer](/docs/getting-started#viewer), [Designer](/docs/getting-started#designer)（フィールド未選択時）で利用される。PDF のレンダリングと見た目を合わせることでプレビューとして機能する
  - **form**: [Form](/docs/getting-started#form) で利用される。ユーザーが入力できるようにすることでフォームとして機能する。
  - **designer**: [Designer](/docs/getting-started#designer)（ダブルクリックでフィールド選択時）で利用される。基本的にフォームと同じでユーザーが入力できるようにすることで WYSIWYG エディターとして機能する。textarea や input 要素の場合はフォーカスさせる必要がある。
- **propPanel**: `@pdfme/ui`の[Designer](/docs/getting-started#designer)にて、フィールドの選択時のサイドバーに独自のプロパティ編集用のフォームを追加できる。[form-render](https://xrender.fun/form-render) の JSON 形式(ウィジェットによる拡張も可能)のスキーマで記入することができる。

:::note
pdfme は[pdf-lib](https://pdf-lib.js.org/), [form-render](https://xrender.fun/form-render) に依存しています。  
プラグインを通じて pdfme 内部で使われているこれらのライブラリを操作しプラグインを実現しています。  
必要に応じて上記のライブラリのドキュメントを参照してください。
:::

下記の画像は、プラグインの pdf, ui, propPanel がどこで動作しているかをハイライトしたものです。

- **pdf**
  ![](/img/plugin-pdf.png)
- **ui(mode: viewer), ui(mode: form)**
  ![](/img/plugin-preview.png)
- **ui(mode: designer), ui(mode: viewer), propPanel**
  ![](/img/plugin-designer.png)

### @pdfme/schemas のコードから作り方を学ぶ

自分でスキーマを作成する場合は既存の `@pdfme/schemas` のコードを参考にしながら作成することをおすすめします。  
既存のスキーマのコードはそれぞれ下記のファイルにあります。

- [packages/schemas/src/text/index.ts](https://github.com/pdfme/pdfme/tree/main/packages/schemas/src/text/index.ts): PDF のレンダリングが一番複雑なスキーマで、propPanel も[form-render の Widget](https://xrender.fun/form-render/advanced-widget)を使ってカスタマイズしており、プラグインが複雑なニーズに対応できることがわかる。
- [packages/schemas/src/image/index.ts](https://github.com/pdfme/pdfme/tree/main/packages/schemas/src/image/index.ts): PDF のレンダリングはシンプルな実装だが、ui(mode: form), ui(mode: designer)はレンダリング時に画像を入力するための input type="file"要素を使っている。全体的にシンプルな実装なので、最初はこのスキーマを参考にするのが良いかもしれない。
- [packages/schemas/src/barcodes/index.ts](https://github.com/pdfme/pdfme/tree/main/packages/schemas/src/barcodes/index.ts): ui でバーコードをプレビューするためにリアルタイムで生成したり、そのモジュールを pdf と共有して使っている点がクール。また、一つの実装で 10 種類以上のバーコードをサポートしており、バーコードの種類に応じて propPanel のフォームを変更している。プラグインが柔軟かつ、効率的に作成できることがわかる。

### 独自のスキーマを作成してみる

サンプルのシナリオとして form で署名を記入できるプラグインを作成してみます。  
具体的には [signature_pad](https://github.com/szimek/signature_pad) を使って署名を入力、その署名は画像として DOM と PDF にレンダリングすることができれば実現できるはずです。

Coming soon...
