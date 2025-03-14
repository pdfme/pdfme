# 動的データを持つテーブル

[![動的テーブルのプレビュー](/img/table.png)](https://playground.pdfme.com/)

テーブルスキーマは[V4.5.0](https://github.com/pdfme/pdfme/releases/tag/4.5.0)から追加されました。  
このスキーマを使用すると、PDFにテーブルを追加し、テーブルデータを動的に変更することができます。

## テーブルスキーマの使用方法

テーブルスキーマは`@pdfme/schemas`パッケージに含まれており、`table`としてエクスポートされています。  
以下のコードを使用して、テーブルスキーマを`@pdfme/ui`と`@pdfme/generator`のプラグインとして追加できます。

ページ区切りをサポートするには、テンプレートの`basePdf`プロパティを`{ width: number, height: number, padding: [number,number,number,number] }`に設定してください。

```javascript
import { table } from '@pdfme/schemas';
import { Designer } from '@pdfme/ui';
import { generate } from '@pdfme/generator';

new Designer({
  domContainer,
  template,
  plugins: { Table: table },
});

generate({
  template,
  inputs,
  plugins: { Table: table },
});
```

デザイナーでテーブルを追加すると、以下のようなテンプレートが作成されます：

```json
{
  "schemas": [
    [
      {
        "name": "mytable",
        "type": "table",
        "position": {
          "x": 28.92,
          "y": 51.36
        },
        "width": 150,
        "height": 57.5184,
        "content": "[[\"Alice\",\"New York\",\"Alice is a freelance web designer and developer\"],[\"Bob\",\"Paris\",\"Bob is a freelance illustrator and graphic designer\"]]",
        "showHead": true,
        "head": ["Name", "City", "Description"],
        "headWidthPercentages": [30, 30, 40],
        "tableStyles": {
          "borderWidth": 0.3,
          "borderColor": "#000000"
        },
        "headStyles": {
          "fontName": "NotoSerifJP-Regular",
          "fontSize": 13,
          "characterSpacing": 0,
          "alignment": "left",
          "verticalAlignment": "middle",
          "lineHeight": 1,
          "fontColor": "#ffffff",
          "borderColor": "",
          "backgroundColor": "#2980ba",
          "borderWidth": {
            "top": 0,
            "right": 0,
            "bottom": 0,
            "left": 0
          },
          "padding": {
            "top": 5,
            "right": 5,
            "bottom": 5,
            "left": 5
          }
        },
        "bodyStyles": {
          "fontName": "NotoSerifJP-Regular",
          "fontSize": 13,
          "characterSpacing": 0,
          "alignment": "left",
          "verticalAlignment": "middle",
          "lineHeight": 1,
          "fontColor": "#000000",
          "borderColor": "#888888",
          "backgroundColor": "",
          "alternateBackgroundColor": "#f5f5f5",
          "borderWidth": {
            "top": 0.1,
            "right": 0.1,
            "bottom": 0.1,
            "left": 0.1
          },
          "padding": {
            "top": 5,
            "right": 5,
            "bottom": 5,
            "left": 5
          }
        },
        "columnStyles": {},
        "required": false,
        "readOnly": false
      }
    ]
  ],
  "basePdf": {
    "width": 210,
    "height": 297,
    "padding": [20, 20, 20, 20]
  },
  "pdfmeVersion": "5.0.0"
}
```

上記のテンプレートに対するジェネレーターの入力を以下のように設定できます：

```json
[
  {
    "mytable": [
      ["Alice", "New York", "Alice is a freelance web designer and developer"],
      ["Bob", "Paris", "Bob is a freelance illustrator and graphic designer"]
    ]
  }
]
```

入力は2次元配列または文字列化された2次元配列のいずれかです。

ジェネレーターの入力データを変更することで、テーブルの内容を動的に変更できます。

```json
[
  {
    "mytable": [
      ["Alice", "New York", "Alice is a freelance web designer and developer"],
      ["Bob", "Paris", "Bob is a freelance illustrator and graphic designer"],
      ["Charlie", "London", "Charlie is a freelance photographer"]
    ]
  }
]
```

![3行のテーブル](/img/table-generated-pdf2.png)

入力データが複数ページにまたがる場合、自動的にページ区切りが挿入されます。

![ページ区切りのあるテーブル](/img/table-generated-pdf3.png)

## テーブル設定について

デザイナーを使用すると、テーブルの列数と行数を簡単に設定できます。また、テーブルのスタイルも自由に設定できます。

### 列と行の設定

選択したテーブルをクリックすると、編集モードになります。

このモードでは、各列の「-」ボタンを使用して列を削除したり、テーブルの右下にある「+」ボタンを使用して列を追加したりできます。
また、ドラッグアンドドロップで列幅を変更することもできます。

行の設定については、テーブルの下部にある「+」ボタンを使用して行を追加したり、各行の右側にある「-」ボタンを使用して行を削除したりできます。
PDFを作成する際の実際の行数はデータによって異なりますが、編集不可能なテーブルを作成する際に行数を設定するためにこの機能を使用できます。

![テーブルの列、行設定](/img/table-column-row-seting.gif)

### テーブルスタイル

他のスキーマと同様に、右側のプロパティパネルからスタイルを設定できます。
スタイルは大きく4つのタイプに分類されます：

- テーブルスタイル
- ヘッダースタイル
- ボディスタイル
- 列スタイル

それぞれに対して、境界線、フォント、背景色、パディングなどを設定できます。
ボディの代替背景色は、行の背景色を交互に変更するために使用されます。

## テーブルスキーマを使用したサンプル

テーブルスキーマを使用したサンプルは[https://playground.pdfme.com/](https://playground.pdfme.com/)で確認できます。

[![テーブルスキーマのプレイグラウンド](/img/table-invoice-template.png)](https://playground.pdfme.com/)

テンプレートプリセットを「Invoice」に設定して、テーブルスキーマを使用したサンプルを探索してください。

このプレイグラウンドのソースコードは[こちら](https://github.com/pdfme/pdfme/tree/main/playground)で入手できます。

:::info

テーブルスキーマの使用に関するフィードバックや提案がある場合は、[GitHub issues](https://github.com/pdfme/pdfme/issues)または[Discord](https://discord.gg/xWPTJbmgNV)からお知らせください。  
あなたのフィードバックはpdfmeの開発に大きく貢献します。

:::
