---
sidebar_position: 1
---

# Getting Started

:::caution

pdfme is now beta version. Please report any issues or suggestions from [Help page](/help) or [edit this page.](https://github.com/hand-dot/pdfme/tree/main/website/docs/getting-started.md)
:::

## はじめに

pdfme は PDF 作成を簡単にするために作成されました。特に下記のユースケースで非常に便利に使えます。

- デザインされた PDF を短いコードで作成したい
- 複数の種類の PDF 作成をしたい
- パフォーマンスを落とさずに大量の PDF 作成が必要

代表的な使用例として作者が運用しているサービス [https://labelmake.jp/](https://labelmake.jp/) では 100 種類を超える種類の PDF が作成でき、月間 10 万を超える PDF ファイルを作成しています。

## 動作環境, インストール

動作環境は`">=14"`の node 環境で動作させて下さい。

パッケージのインストールは下記のコマンドで行うことができます。

```
npm i pdfme
```

pdfme では下記の関数とクラスがあります。

- generate
- Designer
- Viewer
- Form

webpack の環境では下記のように必要なものをインポートしてください。

```ts
import { generate, Designer, Viewer, Form } from 'pdfme';
```

全てのオブジェクトで Template を使うので次のセクションで簡単に説明します。

## Template

pdfme のライブラリの中心は Template です。全てのオブジェクトで Template を扱います。  
Template は PDF ファイルを固定部分と変動部分の 2 つに分類します。
テンプレートの説明としては下記の画像がイメージしやすいと思います。
![](/img/template.png)

basePdf, schemas というプロパティで構成されています。

- basePdf: 作成する PDF の固定部分の PDF データです。
- schemas: 作成する PDF の変動部分の定義データです。

schemas には現在下記のタイプのデータが利用できます。

- text
- image
- 各種 barcode

具体的なデータを見て見ましょう。  
(TypeScript を使用している場合は Template の型をインポートすることができます。)

```ts
import { Template, blankPdf } from 'pdfme';

const template: Template = {
  schemas: [
    {
      a: {
        type: 'text',
        position: { x: 0, y: 0 },
        width: 10,
        height: 10,
      },
      b: {
        type: 'text',
        position: { x: 10, y: 10 },
        width: 10,
        height: 10,
      },
      c: {
        type: 'text',
        position: { x: 20, y: 20 },
        width: 10,
        height: 10,
      },
    },
  ],
  basePdf: blankPdf,
};
```

basePdf には base64 の `string`, `ArrayBuffer`, `Uint8Array` を渡すことができます。
A4 の空の PDF は `blankPdf` でインポートすることができます。動作チェックに使って見てください。

テンプレートは[こちらのページ](/template-design)から作成できます。もしくは [Designer のセクション](/docs/getting-started#designer)からアプリケーションに組み込む方法をチェックしてください。

[詳しくはこちらの Template 型の API ドキュメントを参照ください。](/docs/api/#template)

## Generator

PDF 作成関数である `generate` はテンプレートと inputs を受け取って PDF を作成します。
Node.js とブラウザーのどちらでも動作します。

[上記で作成したテンプレート](/docs/getting-started#template)を使って PDF ファイルを作成するコードは下記のようになります。

```ts
import { Template, generate } from 'pdfme';

const template: Template = {
  // skip...　Check the template section.
};
const inputs = [{ a: 'a1', b: 'b1', c: 'c1' }];

generate({ template, inputs }).then((pdf) => {
  console.log(pdf);

  // Browser
  // const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
  // window.open(URL.createObjectURL(blob));

  // Node.js
  // fs.writeFileSync(path.join(__dirname, `test.pdf`), pdf);
});
```

下記のような PDF ファイルが作成できます。

![](/img/simplePdf.png)

また、inputs の配列の各要素は PDF のページに対応しているので、inputs を複数指定することで複数ページの PDF ファイルを作成することができます。

[詳しくはこちらの generate 関数の API ドキュメントを参照ください。](/docs/api/#generate)

## Designer

デザイナーを使えば Template の schemas を編集でき、Template の json オブジェクトを誰でも簡単に作成することができます。

[こちらのページ](/template-design)からテンプレートをデザインすることができますし、デザイナーをアプリケーションに組み込むこともできます。

PDF のテンプレートをユーザーにデザインさせたい場合にアプリケーションに組み込む必要があるでしょう。
下記からはデザイナーをアプリケーションに組み込む方法を解説します。

[上記で作成したテンプレート](/docs/getting-started#template)を初期値のテンプレートとして使ってデザイナーを組み込んでみます。

```ts
import { Template, Designer } from 'pdfme';

const domContainer = document.getElementById('container');
const template: Template = {
  // skip...　Check the template section.
};

const designer = new Designer({ domContainer, template });
```

上記のように Designer クラスをインスタンス化して、domContainer にテンプレートデザイナーを表示しています。  
下記のようにテンプレートを編集することができます。操作方法は Google Slides などを参考にしており、一般的なキーボードショートカットを使うことができます。

![](/img/designer.gif)

designer インスタンスには下記のようなメソッドで操作を行うことができます。

- `saveTemplate`
- `updateTemplate`
- `getTemplate`
- `onChangeTemplate`
- `onSaveTemplate`
- `destroy`

などのメソッドがあり、ユーザーの変更内容を保存したり、テンプレートを更新したりすることができます。

[詳しくはこちらの Designer クラスの API ドキュメントを参照ください。](/docs/api/classes/Designer#methods)

## Form

テンプレート使ってフォームや、PDF ビューアーを作成することができます。

Form はテンプレートをもとにユーザーに schemas の変動部分を入力してもらう UI を作成します。

```ts
import { Template, Form } from 'pdfme';

const domContainer = document.getElementById('container');
const template: Template = {
  // skip...
};
const inputs = [{ a: 'a1', b: 'b1', c: 'c1' }];

const form = new Form({ domContainer, template, inputs });
```

![](/img/form.gif)

form インスタンスには`getInputs`などのメソッドでユーザーの入力を取得することができます。

下記のコードのように取得したデータを`generate`の inputs として渡せば、ユーザーの入力を元にした PDF ファイルを作成することができます。

```ts
generate({ template, inputs: form.getInputs() }).then((pdf) => {
  const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
  window.open(URL.createObjectURL(blob));
});
```

[詳しくはこちらの Form クラスの API ドキュメントを参照ください。](/docs/api/classes/Form#methods)

## Viewer

Viewer は Generator で作成予定の PDF を確認するために使われます。特にモバイルブラウザで PDF ファイルのプレビューは問題でした。iframe でうまく表示されないためです。

実際には Form を作成する段階で作成できた副産物ですが、Viewer を使うことで、ユーザーに作成予定の PDF ファイルのプレビューを表示することができます。

Viewer の使い方は、基本的に Form の使い方と同じです。

```ts
import { Template, Viewer } from 'pdfme';

const domContainer = document.getElementById('container');
const template: Template = {
  // skip...
};
const inputs = [{ a: 'a1', b: 'b1', c: 'c1' }];

const viewer = new Viewer({ domContainer, template, inputs });
```

![](/img/viewer.png)

[詳しくはこちらの Viewer クラスの API ドキュメントを参照ください。](/docs/api/classes/Viewer#methods)

## 御礼

- [pdf-lib](https://pdf-lib.js.org/): PDF 作成で使用
- [PDF.js](https://mozilla.github.io/pdf.js/): PDF の表示で使用
- [React](https://reactjs.org/): UI の作成で使用
- [react-moveable](https://daybrush.com/moveable/), [react-selecto](https://github.com/daybrush/selecto), [@scena/react-guides](https://daybrush.com/guides/): デザイナーの UI で使用
- [bwip-js](https://github.com/metafloor/bwip-js): バーコードの作成で使用
- [zod](https://github.com/colinhacks/zod): バリーデーションで使用

これらのライブラリがなければ間違いなく pdfme は作れませんでした。これらのライブラリの開発者に感謝しています。
