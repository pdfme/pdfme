# カスタムスキーマ（プラグイン）

デフォルトでは、pdfmeはテキストスキーマを使用できます。しかし、画像やQRコードのスキーマを利用したいユーザーもいるでしょう。
これらは`@pdfme/schemas`パッケージからプラグインとして読み込むことができます。

また、独自のスキーマを作成し、同様にプラグインとして読み込むこともできます。
このページでは、`@pdfme/schemas`からスキーマを使用する方法と、独自のスキーマを作成する方法について説明します。

## @pdfme/schemasからのスキーマの使用

ここでは、`@pdfme/schemas`から画像とQRコードのスキーマをインポートする方法を説明します。

まず、`@pdfme/schemas`をインストールします。

```bash
npm install @pdfme/schemas
```

次に、必要なスキーマを`@pdfme/schemas`から`@pdfme/generator`と`@pdfme/ui`にインポートします。

以下のコードは、`@pdfme/generator`と`@pdfme/ui`からQRコードと画像のスキーマをインポートする例を示しています。

```ts
import type { Template } from '@pdfme/common';
import { text, image, barcodes } from '@pdfme/schemas';
import { generate } from '@pdfme/generator';

const template: Template = {
  // 省略... テンプレートでtext、image、qrcodeスキーマタイプを使用できます。
};
const inputs = [
  // 省略...
];

const pdf = await generate({
  template,
  inputs,
  // ↓ このようにGeneratorでプラグインを使用できます。
  plugins: {
    text,
    image,
    qrcode: barcodes.qrcode,
  },
});
```

この`@pdfme/ui`の例では、Designerを使用していますが、FormとViewerでも同じ方法でプラグインを読み込むことができます。

```ts
import type { Template } from '@pdfme/common';
import { text, image, barcodes } from '@pdfme/schemas';
import { Designer } from '@pdfme/ui';

const domContainer = document.getElementById('container');
const template: Template = {
  // 省略... テンプレートでtext、image、qrcodeスキーマタイプを使用できます。
};

const designer = new Designer({
  domContainer,
  template,
  // ↓ このようにDesignerでプラグインを使用できます。
  plugins: {
    text,
    image,
    qrcode: barcodes.qrcode,
  },
});
```

imageとqrcodeをプラグインとして読み込むことで、テンプレートのスキーマに含まれるimageタイプとqrcodeタイプのスキーマをレンダリングできます。

![](/img/custom-schemas.png)

:::tip

Designerからプラグインを使用することで、デフォルトのスキーマを上書きしてテキストを削除したり、カスタムスキーマに置き換えたり、ラベルの名前を変更したり、順序を並べ替えたりすることができます。

```ts
  plugins: {
    QR: barcodes.qrcode,
    Image: image,
  },
```

![](/img/custom-schemas-tips.png)
:::

## 独自のスキーマの作成

次に、独自のスキーマを作成したい人のための方法を紹介します。  
スキーマを作成した場合や、アイデアがある場合は、[GitHub Discussions](https://github.com/pdfme/pdfme/discussions/288)で共有してください。  
pdfmeはオープンソースとして開発されているため、誰もがスキーマを共有し、一緒に開発できるべきだと考えています。

### カスタムスキーマ/プラグインの概要

カスタムスキーマは3つの要素で構成されており、これらを総称してプラグインと呼びます。  
プラグインの型定義は[packages/common/src/types.ts](https://github.com/pdfme/pdfme/blob/main/packages/common/src/types.ts)ファイル内で定義されています。

**プラグイン**の構造と動作方法について説明します。

- **pdf**: `@pdfme/generator`で使用され、スキーマをPDFにレンダリングするためのコードが含まれています。PDFレンダリングプロセスは[pdf-lib](https://pdf-lib.js.org/)によって処理されます。
- **ui**: `@pdfme/ui`で使用され、スキーマをDOMにレンダリングするためのコードが含まれています。uiには以下のモードがあります：
  - **viewer**: [Viewer](/docs/getting-started#viewer)、[Designer](/docs/getting-started#designer)（フィールドが選択されていない場合）で使用されます。PDFのレンダリングと外観に合わせてプレビューとして機能します。
  - **form**: [Form](/docs/getting-started#form)で使用されます。ユーザーが入力できるフォームとして機能します。
  - **designer**: [Designer](/docs/getting-started#designer)（フィールドがダブルクリックされた場合）で使用されます。基本的にはフォームと同じですが、ユーザーが入力できるWYSIWYGエディタとして機能します。textareaやinput要素の場合、フォーカスが必要です。
- **propPanel**: `@pdfme/ui`の[Designer](/docs/getting-started#designer)で使用され、フィールドが選択されたときにサイドバーにカスタムプロパティ編集フォームを追加できます。[form-render](https://xrender.fun/form-render)のJSON形式を使用して入力できます（ウィジェット拡張も可能）。

:::note
pdfmeは[pdf-lib](https://pdf-lib.js.org/)と[form-render](https://xrender.fun/form-render)に依存しています。  
これらのライブラリはプラグインを通じて操作され、pdfme内での機能を実現しています。  
必要に応じて上記のライブラリのドキュメントを参照してください。
:::

以下の画像は、プラグインのpdf、ui、propPanelが使用される場所を示しています。

- **pdf**
  ![](/img/plugin-pdf.png)
- **ui(mode: viewer), ui(mode: form)**
  ![](/img/plugin-preview.png)
- **ui(mode: designer), ui(mode: viewer), propPanel**
  ![](/img/plugin-designer.png)

### @pdfme/schemasのコードから学ぶ作成方法

独自のスキーマを作成する場合は、`@pdfme/schemas`内の既存のコードを参照することをお勧めします。  
既存のスキーマのコードは以下のファイルにあります：

- [packages/schemas/src/text/index.ts](https://github.com/pdfme/pdfme/tree/main/packages/schemas/src/text/index.ts): PDFレンダリングの観点から最も複雑なスキーマです。propPanelも[form-renderのWidget](https://xrender.fun/form-render/advanced-widget)を使用してカスタマイズされており、プラグインが複雑なニーズに対応できることを示しています。
- [packages/schemas/src/graphics/image.ts](https://github.com/pdfme/pdfme/blob/main/packages/schemas/src/graphics/image.ts): PDFレンダリングのシンプルな実装ですが、ui(mode: form)とui(mode: designer)レンダリング中に画像入力にinput type="file"要素を使用しています。全体的にシンプルな実装であり、良い出発点になるかもしれません。
- [packages/schemas/src/barcodes/index.ts](https://github.com/pdfme/pdfme/tree/main/packages/schemas/src/barcodes/index.ts): uiプレビュー用にバーコードをリアルタイムで生成するのに優れており、そのモジュールをpdfと共有しています。また、10種類以上のバーコードをサポートし、バーコードのタイプに応じてpropPanelのフォームを変更します。プラグインが柔軟かつ効率的であることを示しています。

:::tip

- `PropPanel.defaultSchema.rotate`が設定されていないか、undefinedの場合、Designerから回転ハンドルが消えます。
- 回転が不要な場合は、PDFレンダリングでの実装をスキップすると効率的です。

:::

### 署名プラグイン作成のサンプルシナリオ

サンプルシナリオとして、フォームに署名を入力できるプラグインを作成してみましょう。  
具体的には、[signature_pad](https://github.com/szimek/signature_pad)を使用して署名を入力し、その署名をDOMとPDFの両方で画像としてレンダリングできるようにします。

[![](/img/signature-schema.gif)](https://playground.pdfme.com/)

- デモ: https://playground.pdfme.com/
- コード: [pdfme-playground/src/plugins/signature.ts](https://github.com/pdfme/pdfme-playground/blob/main/src/plugins/signature.ts)


### カスタムスキーマ作成時の注意点

#### レンダラースキーマのキャッシング

pdfmeは、メモリやCPUを多く使用するコンテンツのキャッシングをサポートしており、同じレンダリングプロセス内で再利用できます。

最も一般的なユースケースは、同じテンプレートで多数のPDFをレンダリングする場合です。多くの場合、これらの
入力は同じである可能性があり、スキーマはキャッシングの恩恵を受けることができます。これはオプションですが、カスタムスキーマを他の人に使用してもらうことを意図している場合は検討すべきです。

キャッシングの例は、[image](https://github.com/pdfme/pdfme/blob/main/packages/schemas/src/graphics/image.ts)と[barcode](https://github.com/pdfme/pdfme/blob/main/packages/schemas/src/barcodes/pdfRender.ts)のスキーマレンダリング関数の両方で利用できます。生成されるPDFアーティファクトの一意性を捉えるキャッシュキーを選択する必要があります（サイズや位置などの属性は除外され、通常はレンダリング時にpdf-libによって処理されます）。バーコードスキーマでは、デフォルトの`getCacheKey`関数を使用する画像と比較して、その一意性を記述するためにより多くの属性が必要であることに気付くでしょう。

## コミュニティの貢献

pdfmeコミュニティは、プロジェクトで役立つさまざまなカスタムプラグインを作成し共有しています。以下はコミュニティによって貢献されたプラグインの一部です：

### 軽量QRコードプラグイン

組み込みのバーコードスキーマで使用される大きな`bwip-js`パッケージの代わりに、`qrcode` npmパッケージを使用する軽量な代替QRコードプラグインです。このプラグインはQRコード機能を提供しながらも、バンドルサイズが大幅に小さくなっています。

- **Gist**: [pdfmeのための軽量qrcodeプラグイン](https://gist.github.com/kyasu1/0def72d6f0826b0a9571b6e13f3c9065)
- **作者**: [kyasu1](https://github.com/kyasu1)
- **特徴**:
  - 組み込みのバーコードスキーマと比較して小さいバンドルサイズ
  - カスタマイズ可能な背景色とバーの色
  - pdfmeとの簡単な統合

このプラグインを使用するには：

1. 必要な依存関係をインストールします：
   ```bash
   npm install qrcode -S
   ```

2. プラグインコードをプロジェクトに追加します（例：`./src/plugins/qrCode.ts`）

3. ジェネレーターまたはUIコンポーネントでプラグインをインポートして使用します：
   ```ts
   import qrCode from "./plugins/qrCode.js";
   
   // ジェネレーターでの使用例
   const pdf = await generate({
     template, 
     inputs, 
     options: { font },
     plugins: {
       // 他のプラグイン
       NodeQRCode: qrCode
     }
   });
   ```

4. テンプレートでスキーマを使用します：
   ```json
   {
     "type": "node-qrCode",
     "content": "https://pdfme.com/",
     "position": { "x": 178, "y": 20 },
     "backgroundColor": "#ffffff",
     "barColor": "#000000",
     "width": 16,
     "height": 16,
     "rotate": 0,
     "opacity": 1,
     "required": false,
     "readOnly": false,
     "name": "qrCode"
   }
   ```

:::tip
pdfmeのために役立つプラグインを作成した場合は、[GitHub Discussions](https://github.com/pdfme/pdfme/discussions/288)で共有して、他の人があなたの成果を活用できるようにしてください！
:::
