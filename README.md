<!--
    このドキュメントはほとんど website/docs/getting-started.md のコピーです
    画像のパスは /img/image.png から /website/static/img/image.png に置換してください
 -->

# PDFME

> pdfme is now beta version. Please report any issues or suggestions from [Help page](/help) or [edit this page.](https://github.com/hand-dot/pdfme/tree/main/website/docs/getting-started.md)

TypeScript base PDF generator and React base UI.
Open source, developed by the community, and completely free to use under the MIT license!

<p align="center">
  <img src="website/static/img/logo.svg" width="300"/>
</p>

## Introduction

<!-- pdfme は PDF 作成を簡単にするために作成されました。特に下記のユースケースで非常に便利に使えます。 -->

pdfme was created to simplify PDF generation. It is especially useful for the following use cases.

<!--
- デザインされた PDF を短いコードで作成したい
- 複数の種類の PDF 作成をしたい
- パフォーマンスを落とさずに大量の PDF 作成が必要
 -->

- Need to create a designed PDF with short code.
- Need to create multiple varieties of PDFs.
- Need to create a large number of PDFs without compromising performance

<!-- 代表的な使用例として作者が運用しているサービス [https://labelmake.jp/](https://labelmake.jp/) では 100 種類を超える種類の PDF が作成でき、月間 10 万を超える PDF ファイルを作成しています。 -->

As a example, the author's service [https://labelmake.jp/](https://labelmake.jp/) can create more than 100 varieties of PDFs and generates more than 100,000 PDF files per month.

## Installation

<!-- 動作環境は`>=14`の node 環境で動作させて下さい。 -->

The operating requirements should be the node environment `>=14`.

<!-- インストールは下記のコマンドで行うことができます。 -->

Installation can be done with the following command.

```
npm i pdfme
```

<!-- pdfme では下記の関数とクラスがあります。 -->

The following functions and classes are available in pdfme.

- generate
- Designer
- Viewer
- Form

<!-- webpack を使用している環境では下記のように必要なものをインポートしてください。 -->

If your environment uses webpack, import the necessary items as shown below.

```ts
import { generate, Designer, Viewer, Form } from 'pdfme';
```

<!-- 全てのオブジェクトで Template を使うので次のセクションで簡単に説明します。 -->

All objects use Template, which will be briefly explained in the next section.

## Template

<!-- pdfme のライブラリの中心は Template です。全てのオブジェクトで Template を使います。
Template は 固定部分と変動部分の 2 つに分類することができます。それらはbasePdf, schemas と呼ばれます。
テンプレートの説明としては下記の画像がイメージしやすいと思います。 -->

The core of pdfme's library is Template.All objects use Template.
A template can be divided into two parts: fixed and variable. They are called basePdf and schemas.
The following image is a good illustration of a template.

![](/website/static/img/template.png)

<!-- - basePdf: 作成する PDF の固定部分の PDF データです。
- schemas: 作成する PDF の変動部分の定義データです。 -->

- **basePdf**: PDF data for the fixed part of the PDF to be generated.
- **schemas**: Definition data for the variable part of the PDF to be generated.

<!-- basePdf には base64 の `string`, `ArrayBuffer`, `Uint8Array` を渡すことができます。
A4 の空の PDF は `blankPdf` でインポートすることができます。動作チェックに使って見てください。 -->

**basePdf** can be given a `string`(base64), `ArrayBuffer`, or `Uint8Array`. A blank A4 PDF can be imported with `blankPdf`. You can use it to check how it works.

<!-- schemas には現在下記のタイプのデータが利用できます。 -->

**schemas** currently has the following types of data available

- text
- image
- Various types of barcodes

<!-- 具体的なデータを見て見ましょう。
(TypeScript を使用している場合は Template の型をインポートすることができます。) -->

Let's take a look at some specific data.  
(If you are using TypeScript, you can import the Template type.)

```ts
import { Template, blankPdf } from 'pdfme';

const template: Template = {
  basePdf: blankPdf,
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
};
```

<!-- [詳しくはこちらの Template 型の API ドキュメントを参照ください。](/docs/api/#template) -->

[For more information, please refer to the API documentation of the Template type here](/docs/api/#template).

<!-- テンプレートは[Template Design page](/template-design)から作成できます。もしくはテンプレート作成機能をアプリケーションに組み込みたい場合は [Designer のセクション](/docs/getting-started#designer)をチェックしてください。 -->

You can create a template from [Template Design page](/template-design). Or, if you want to integrate the template creation feature into your application, check out the [Designer section](/docs/getting-started#designer).

## Generator

<!-- PDF 作成関数である `generate` は`テンプレート`と `inputs` を受け取って PDF を作成します。
Node.js とブラウザーのどちらでも動作します。 -->

The PDF generator function, `generate`, takes 2 arguments of `template` and `inputs` for generate a PDF. It works both in Node.js and in the browser.

<!-- [上記で作成したテンプレート](/docs/getting-started#template)を使って PDF ファイルを作成するコードは下記のようになります。 -->

The code to generate a PDF file using the [template created above](/docs/getting-started#template) is shown below.

```ts
import { Template, generate } from 'pdfme';

const template: Template = {
  // skip...　Check the Template section.
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

<!-- 下記のような PDF ファイルが作成できます。 -->

You can create a PDF file like the below.

![](/website/static/img/simplePdf.png)

<!-- また、inputs の配列の各要素は PDF のページに対応しているので、inputs の要素を複数指定することで複数ページの PDF ファイルを作成することができます。 -->

Also, each element in the inputs array corresponds to a page in the PDF, you can create a multi-page PDF file by providing multiple elements of inputs.

<!-- [詳しくはこちらの generate 関数の API ドキュメントを参照ください。](/docs/api/#generate) -->

[For more information, please refer to the API documentation of the generate function here](/docs/api/#generate).

## Designer

<!-- デザイナーを使えば Template の schemas を編集でき、Template の json オブジェクトを誰でも簡単に作成することができます。 -->

The Designer allows you to edit the Template schemas, making it easy for anyone to create Template json objects.

<!-- [こちらのページ](/template-design)からテンプレートをデザインすることができますし、デザイナーをアプリケーションに組み込むこともできます。 -->

You can design your own template from [Template Design page](/template-design), or you can integrate the designer into your application.

<!-- [上記で作成したテンプレート](/docs/getting-started#template)を初期値のテンプレートとして使ってデザイナーを組み込んでみます。 -->

Let's integrate the designer using the template created above as the default template.

```ts
import { Template, Designer } from 'pdfme';

const domContainer = document.getElementById('container');
const template: Template = {
  // skip...　Check the Template section.
};

const designer = new Designer({ domContainer, template });
```

<!-- 上記のように Designer クラスをインスタンス化して、`domContainer` にテンプレートデザイナーを表示しています。
下記のようにテンプレートを編集することができます。操作方法は Google Slides などを参考にしており、一般的なキーボードショートカットを使うことができます。 -->

The Designer class is instantiated as shown above, and the template designer is displayed in the `domContainer`.  
You can edit the template as shown below. The operation is based on Google Slides, etc., and you can use common keyboard shortcuts.

![](/website/static/img/designer.gif)

<!-- designer インスタンスには下記のようなメソッドで操作を行うことができます。 -->

The designer instance can be manipulated with the following methods.

- `saveTemplate`
- `updateTemplate`
- `getTemplate`
- `onChangeTemplate`
- `onSaveTemplate`
- `destroy`

[For more information, please refer to the API documentation of the Designer class here](/docs/api/classes/Designer#methods).

## Form

<!-- テンプレート使ってフォームや、PDF ビューアーを作成することができます。 -->

You can use templates to create forms and PDF viewers.

<!-- Form はテンプレートをもとにユーザーに変動部分(schemas)を入力してもらう UI を作成します。 -->

The Form creates a UI for the user to enter schemas based on the template.

```ts
import { Template, Form } from 'pdfme';

const domContainer = document.getElementById('container');
const template: Template = {
  // skip...
};
// This is initial data.
const inputs = [{ a: 'a1', b: 'b1', c: 'c1' }];

const form = new Form({ domContainer, template, inputs });
```

![](/website/static/img/form.gif)

<!-- form インスタンスには`getInputs`のメソッドでユーザーの入力を取得することができます。 -->

The form instance has a method `getInputs` to get the user's input.

<!-- 下記のコードのようにgetInputsで取得したデータをgenerateの inputs として渡せば、ユーザーの入力を元にした PDF ファイルを作成することができます。 -->

You can generate a PDF file based on the user's input by passing the data you get from `getInputs` as inputs to generate, as shown in the code below.

```ts
generate({ template, inputs: form.getInputs() }).then((pdf) => {
  const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
  window.open(URL.createObjectURL(blob));
});
```

<!-- [詳しくはこちらの Form クラスの API ドキュメントを参照ください。](/docs/api/classes/Form#methods) -->

[For more information, please refer to the API documentation of the Form class here](/docs/api/classes/Form#methods).

## Viewer

<!-- モバイルブラウザで PDF ファイルを表示することは面倒です。iframe でうまく表示されないためです。 -->

Viewing a PDF file in a mobile browser is a pain, because it doesn't display well in an iframe.

<!-- Viewerは Form を作成する段階で作成できた副産物ですが、Viewer を使うことで、ユーザーに作成予定の PDF ファイルのプレビューを表示することができます。 -->

The Viewer is a byproduct of the Form development process, but it allows you to show your users a preview of the PDF file you will create.

<!-- Viewer の使い方は、ユーザーが編集ができないと言う部分を除いて、基本的に Form の使い方と同じです。 -->

Using the Viewer is basically the same as using the Form, except that user cannot edit it.

```ts
import { Template, Viewer } from 'pdfme';

const domContainer = document.getElementById('container');
const template: Template = {
  // skip...
};
const inputs = [{ a: 'a1', b: 'b1', c: 'c1' }];

const viewer = new Viewer({ domContainer, template, inputs });
```

![](/website/static/img/viewer.png)

<!-- [詳しくはこちらの Viewer クラスの API ドキュメントを参照ください。](/docs/api/classes/Viewer#methods) -->

[For more information, please refer to the API documentation of the Viewer class here](/docs/api/classes/Viewer#methods).

## Special Thanks

- [pdf-lib](https://pdf-lib.js.org/): Used in PDF generation.
- [PDF.js](https://mozilla.github.io/pdf.js/): Used in PDF viewing.
- [React](https://reactjs.org/): Used in building the UI.
- [react-moveable](https://daybrush.com/moveable/), [react-selecto](https://github.com/daybrush/selecto), [@scena/react-guides](https://daybrush.com/guides/): Used in Designer UI.
- [bwip-js](https://github.com/metafloor/bwip-js): Used in barcode generation.
- [zod](https://github.com/colinhacks/zod): Used in Validation.

<!-- これらのライブラリがなければ間違いなく pdfme は作れませんでした。これらのライブラリの開発者に感謝しています。 -->

I definitely could not have created pdfme without these libraries. I am grateful to the developers of these libraries.
