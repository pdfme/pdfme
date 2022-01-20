---
sidebar_position: 1
---

# Getting Started

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

pdfme では PDF ファイルを固定部分と変動部分の 2 つに分類します。
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

## Generator

この関数はテンプレートと inputs を受け取って PDF を作成します。
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

  // ブラウザー
  // const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
  // window.open(URL.createObjectURL(blob));

  // Node.js
  // fs.writeFileSync(path.join(__dirname, `test.pdf`), pdf);
});
```

下記のような PDF ファイルが作成できます。

![](/img/simplePdf.png)

また、inputs の配列の各要素は PDF のページに対応しているので、inputs を複数指定することで複数ページの PDF ファイルを作成することができます。

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

// 保存時に呼ばれるコールバック
const saveTemplate = (t: Template) => {
  console.log(t); // provide a modified template
};

const desinger = new Designer({ domContainer, template, saveTemplate });
```

上記のように Designer クラスをインスタンス化して、domContainer にテンプレートデザイナーを表示しています。
下記のようにテンプレートを編集することができます。操作方法は Google Slides などを参考にしており、一般的なキーボードショートカットを使うことができます。

![](/img/designer.gif)

desinger インスタンスには下記のメソッドで操作を行うことができます。

- saveTemplate
- updateTemplate
- getTemplate
- onChangeTemplate
- destroy

などのメソッドがあり、ユーザーの変更内容を保存したり、テンプレートを更新したりすることができます。

[詳しくはこちらの API ドキュメントを参照ください。](/docs/api/classes/Designer#methods)

## Form

## Viewer
