# はじめに

:::tip インタラクティブなドキュメント
[DeepWiki](https://deepwiki.com/pdfme/pdfme)を使用すると、pdfmeのドキュメントやソースコードについてインタラクティブに質問できます。コードの使い方や機能について疑問がある場合に便利です。
:::

## イントロダクション

pdfmeはPDFのデザインと生成プロセスを簡素化するために作成されました。特に以下のようなユースケースに役立ちます：

- 短いコードでデザインされたPDFを作成する必要がある場合
- アプリケーションにPDFエディタ機能を統合する必要がある場合
- パフォーマンスを損なうことなく大量のPDFを作成する必要がある場合

## インストール

動作要件はnode環境 `>=16` です。  
pdfmeには、generatorとUIの2つのパッケージがあります。

PDFを生成するためのパッケージは、以下のコマンドでインストールできます。

```
npm i @pdfme/generator @pdfme/common
```

PDFデザイナー、フォーム、ビューワーを使用するためのパッケージは、以下のコマンドでインストールできます。

```
npm i @pdfme/ui @pdfme/common
```

\*どのパッケージを使用する場合でも、`@pdfme/common`をインストールする必要があります。

pdfmeでは以下の型、関数、クラスが利用可能です。

`@pdfme/common`

- [Template](/docs/getting-started#template)

`@pdfme/generator`

- [generate](/docs/getting-started#generator)

`@pdfme/ui`

- [Designer](/docs/getting-started#designer)
- [Form](/docs/getting-started#form)
- [Viewer](/docs/getting-started#viewer)

環境がwebpackを使用している場合は、以下のように必要なアイテムをインポートします。

```ts
import type { Template } from '@pdfme/common';
import { generate } from '@pdfme/generator';
```

```ts
import type { Template } from '@pdfme/common';
import { Designer, Form, Viewer } from '@pdfme/ui';
```

**すべてのオブジェクトは`Template`を使用しており、これについては次のセクションで簡単に説明します。**

## テンプレート

pdfmeライブラリの中核はテンプレートです。  
テンプレート型は`@pdfme/generator`または`@pdfme/ui`の両方からインポートできます。テンプレートはあらゆる場所で使用されます。

テンプレートは、固定部分と可変部分の2つに分けることができます。  
これらをbasePdfとschemaと呼びます。
以下の画像はテンプレートの良い例です。

![](/img/template.png)

- **basePdf**: 生成されるPDFの固定部分のPDFデータ。
- **schemas**: 生成されるPDFの可変部分の定義データ。

**basePdf**プロパティは、`string`（base64エンコード）、`ArrayBuffer`、または`Uint8Array`としてPDFデータを受け入れます。`BLANK_PDF`を使用して空白のA4 PDFをインポートして動作を確認できます。または、以下のように空のPDFを定義することもできます。ページ区切りが必要なテーブルなどのスキーマを使用する場合は、以下の形式でPDFを指定してください：

```json
basePdf: { "width": 210, "height": 297, "padding": [10, 10, 10, 10] }
```


**schemas**はデフォルトではテキストのみ使用できますが、`@pdfme/schemas`パッケージからプラグインとして画像やQRコードなどの様々なバーコードを読み込むことができます。  
さらに、独自のスキーマを作成することで、上記以外の種類をレンダリングすることも可能です。  
詳細は[カスタムスキーマ](/docs/custom-schemas)をご覧ください。

具体的なデータを見てみましょう。  
（TypeScriptを使用している場合は、Template型をインポートできます。）

### 最小限のテンプレート

```ts
import { Template, BLANK_PDF } from '@pdfme/common';

const template: Template = {
  basePdf: BLANK_PDF,
  schemas: [
    [
      {
        name: 'a',
        type: 'text',
        position: { x: 0, y: 0 },
        width: 10,
        height: 10,
      },
      {
        name: 'b',
        type: 'text',
        position: { x: 10, y: 10 },
        width: 10,
        height: 10,
      },
      {
        name: 'c',
        type: 'text',
        position: { x: 20, y: 20 },
        width: 10,
        height: 10,
      },
    ],
  ],
};
```

[テンプレートデザインページ](/template-design?ui=designer&template=a4-blank)からテンプレートを作成できます。または、テンプレート作成機能をアプリケーションに統合したい場合は、[デザイナーセクション](/docs/getting-started#designer)をご覧ください。

### プラグインの使用

デフォルトでは、例は多くの場合`text`スキーマタイプの使用を示しています。ただし、他の組み込みスキーマタイプを使用したり、`@pdfme/schemas`パッケージで独自のカスタムスキーマを作成したりすることもできます。

#### ステップ1: `@pdfme/schemas`のインストール

追加のスキーマタイプにアクセスするために必要なパッケージをインストールします。

```bash
npm install @pdfme/schemas
```

#### ステップ2: 組み込みおよびカスタムスキーマタイプの使用

以下は、組み込みとカスタムの両方のスキーマタイプを使用したテンプレートの例です：

```ts
import { Template, BLANK_PDF } from '@pdfme/common';
import { text, barcodes, image } from '@pdfme/schemas';
import myCustomPlugin from './custom-plugins';

const template: Template = {
  basePdf: BLANK_PDF,
  schemas: [
    [
      {
        name: 'example_text',
        type: 'text',
        position: { x: 0, y: 0 },
        width: 40,
        height: 10,
      },
      {
        name: 'example_image',
        type: 'image',
        position: { x: 200, y: 200 },
        width: 60,
        height: 40,
      },
      {
        name: 'example_qr_code',
        type: 'qrcode',
        position: { x: 100, y: 100 },
        width: 50,
        height: 50,
      },
    ],
  ],
};

const plugins = {
  Text: multiVariableText,
  'QR Code': barcodes.qrcode,
  Image: image,
  MyCustomPlugin: myCustomPlugin,
};

const inputs = [
  {
    example_text: 'Hello, World!',
    example_image: 'data:image/png;base64,iVBORw0KG....',
    example_qr_code: 'https://pdfme.com/',
  },
];

generate({ template, inputs, plugins }).then((pdf) => {
  console.log(pdf);
});
```

#### 組み込みスキーマタイプの探索

サポートされているすべての組み込みスキーマタイプを表示するには、[サポートされている機能のドキュメント](/docs/supported-features)を参照してください。

#### カスタムスキーマタイプの作成

組み込みではないスキーマタイプが必要な場合は、独自のものを定義できます。詳細な手順については、[カスタムスキーマガイド](/docs/custom-schemas#creating-your-own-schemas)をご覧ください。

## ジェネレーター

PDF生成関数`generate`は、PDFを生成するために`template`と`inputs`の2つの引数を取ります。これはNode.jsとブラウザの両方で動作します。

[上記で作成したテンプレート](/docs/getting-started#minimal-template)を使用してPDFファイルを生成するコードを以下に示します。

```ts
import type { Template } from '@pdfme/common';
import { generate } from '@pdfme/generator';

const template: Template = {
  // 省略...　テンプレートセクションを確認してください。
};
const inputs = [{ a: 'a1', b: 'b1', c: 'c1' }];

generate({ template, inputs }).then((pdf) => {
  console.log(pdf);

  // ブラウザ
  // const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
  // window.open(URL.createObjectURL(blob));

  // Node.js
  // fs.writeFileSync(path.join(__dirname, `test.pdf`), pdf);
});
```

以下のようなPDFファイルを作成できます。

![](/img/simple-pdf.png)

また、inputs配列の各要素はPDFのページに対応しており、複数の要素を提供することで複数ページのPDFファイルを作成できます。

## UI

UIは[デザイナー](/docs/getting-started#designer)、[フォーム](/docs/getting-started#form)、[ビューワー](/docs/getting-started#viewer)クラスで構成されています。

### デザイナー

デザイナーを使用すると、テンプレートスキーマを編集でき、誰でも簡単にテンプレートJSONオブジェクトを作成できます。

[テンプレートデザインページ](/template-design?ui=designer&template=a4-blank)から独自のテンプレートをデザインするか、デザイナーをアプリケーションに統合することができます。

上記で作成したテンプレートをデフォルトテンプレートとして使用し、デザイナーを統合してみましょう。

```ts
import type { Template } from '@pdfme/common';
import { Designer } from '@pdfme/ui';

const domContainer = document.getElementById('container');
const template: Template = {
  // 省略...　テンプレートセクションを確認してください。
};

const designer = new Designer({ domContainer, template });
```

デザイナークラスは上記のようにインスタンス化され、テンプレートデザイナーが`domContainer`に表示されます。  
以下のようにテンプレートを編集できます。操作はGoogle Slidesなどに似ているため、一般的なキーボードショートカットを使用できます。

![](/img/designer.gif)

デザイナーインスタンスは以下のメソッドで操作できます。

- `saveTemplate`
- `updateTemplate`
- `getTemplate`
- `onChangeTemplate`
- `onSaveTemplate`
- `destroy`

### フォーム

テンプレートを使用してフォームとPDFビューワーを作成できます。

フォームは、ユーザーがテンプレートに基づいてスキーマを入力するためのUIを作成します。

[こちら](/template-design?ui=form-viewer&template=invoice)から請求書テンプレートを使用したフォームを試すことができます。

```ts
import type { Template } from '@pdfme/common';
import { Form } from '@pdfme/ui';

const domContainer = document.getElementById('container');
const template: Template = {
  // 省略...
};
// これは初期データです。
const inputs = [{ a: 'a1', b: 'b1', c: 'c1' }];

const form = new Form({ domContainer, template, inputs });
```

![](/img/form.gif)

フォームインスタンスには、ユーザーの入力を取得するための`getInputs`メソッドがあります。

以下のコードに示すように、`getInputs`から取得したデータを入力として渡すことで、ユーザーの入力に基づいてPDFファイルを生成できます。

```ts
generate({ template, inputs: form.getInputs() }).then((pdf) => {
  const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
  window.open(URL.createObjectURL(blob));
});
```

### ビューワー

モバイルブラウザでPDFファイルを表示するのは、iframeでうまく表示されないため面倒です。

ビューワーはフォーム開発プロセスの副産物ですが、作成するPDFファイルのプレビューをユーザーに表示することができます。

ビューワーの使用は基本的にフォームの使用と同じですが、ユーザーが編集できない点が異なります。

```ts
import type { Template } from '@pdfme/common';
import { Viewer } from '@pdfme/ui';

const domContainer = document.getElementById('container');
const template: Template = {
  // 省略...
};
const inputs = [{ a: 'a1', b: 'b1', c: 'c1' }];

const viewer = new Viewer({ domContainer, template, inputs });
```

![](/img/viewer.png)

## 特別な感謝

- [pdf-lib](https://pdf-lib.js.org/): PDF生成に使用。
- [fontkit](https://github.com/foliojs/fontkit): フォントレンダリングに使用。
- [PDF.js](https://mozilla.github.io/pdf.js/): PDF表示に使用。
- [React](https://reactjs.org/): UI構築に使用。
- [form-render](https://xrender.fun/form-render): UI構築に使用。
- [antd](https://ant.design/): UI構築に使用。
- [react-moveable](https://daybrush.com/moveable/), [react-selecto](https://github.com/daybrush/selecto), [@scena/react-guides](https://daybrush.com/guides/): デザイナーUIに使用。
- [dnd-kit](https://github.com/clauderic/dnd-kit): デザイナーUIに使用。
- [Lucide](https://lucide.dev/) デザイナーUIとスキーマのアイコンに使用。

これらのライブラリなしではpdfmeを作成することはできませんでした。これらのライブラリの開発者に感謝します。

pdfmeに貢献したい場合は、[開発ガイド](/docs/development-guide)ページをご確認ください。  
あなたの貢献をお待ちしています！

## クラウドサービスオプション

pdfmeは強力なオープンソースライブラリですが、一部のユーザーはマネージドソリューションを好む場合があることを理解しています。セットアップやメンテナンスの必要なく、すぐに使える、スケーラブルなPDF生成サービスを探している方には、pdfme Cloudを提供しています。

**[pdfme Cloudを試す - 手間のかからないPDF生成](https://app.pdfme.com?utm_source=website&utm_content=getting-started)**

pdfme Cloudはオープンソースライブラリのすべての機能に加えて、以下を提供します：

- インフラ管理なしでスケーラブルなPDF生成
- ホスト型WYSIWYGテンプレートデザイナー
- シンプルなAPI統合
- 自動更新とメンテナンス

\*pdfmeは今後もオープンソースであり続けます。クラウドサービスはマネージドソリューションを好む方向けのオプションサービスです。
