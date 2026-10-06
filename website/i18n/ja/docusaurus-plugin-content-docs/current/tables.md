# 動的データを持つテーブル

[![動的テーブルのプレビュー](/img/table.png)](https://playground.pdfme.com/)

テーブルスキーマは[V4.5.0](https://github.com/pdfme/pdfme/releases/tag/4.5.0)から追加されました。  
このスキーマを使用すると、PDFにテーブルを追加し、テーブルデータを動的に変更することができます。

## テーブルスキーマの使用方法

テーブルスキーマは`@pdfme/schemas`パッケージに含まれており、`table`としてエクスポートされています。  
以下のコードを使用して、テーブルスキーマを`@pdfme/ui`と`@pdfme/generator`のプラグインとして追加できます。

ページ区切りをサポートするには、テンプレートの`basePdf`プロパティを`{ width: number, height: number, padding: [number,number,number,number] }`に設定してください。`basePdf` にカスタム PDF データを使う場合、元のページは固定されるため、動的レイアウトと自動ページ区切りは適用されません。

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

## 画像列

列ごとに画像を選べます。`cellType` がない列はテキストのままで、既存のテンプレートの描画は変わりません。`inputs` と `content` はこれまでどおり `string[][]` です。画像セルの値は PNG または JPEG の data URL です。

```json
{
  "head": ["Name", "Photo", "Note"],
  "headWidthPercentages": [30, 30, 40],
  "columnStyles": {
    "alignment": { "1": "center" },
    "verticalAlignment": { "1": "middle" },
    "cellType": { "1": "image" },
    "imageHeightMode": { "1": "fixed" },
    "imageHeight": { "1": 20 }
  },
  "content": "[[\"Alice\",\"data:image/png;base64,iVBORw0KGgo...\",\"Workshop\"]]"
}
```

`imageHeightMode` と `imageHeight` は別々に保存されるので、`fixed` と `auto` を切り替えてもミリメートルの値は消えません。

- `fixed`（既定）は、その列のすべてのセルを同じ画像の高さにします。`imageHeight` を省略したとき、または 0 より大きい有限の数でないときは 20mm です。空や無効な値でもこの高さを保つので、行はつぶれず、改ページが予測しやすくなります。20mm なら、既定の 1 行が 1 ページを超えることもありません。
- `auto` の画像の高さは `内側の幅 × 画像の高さ / 画像の幅` です。空や無効な値の画像の高さは 0 で、行の高さは他のセルに従います。空白の `basePdf` では、行、ヘッダ（`showHead` が true のとき）、セルの上下の padding と border、1mm の余白がページの内容領域に収まるように高さを上限で切ります。カスタム PDF の `basePdf` は折り返さないので、この上限は使いません。

描画されるのは `data:image/png;base64,...` と `data:image/jpeg;base64,...`（または `image/jpg`）だけです。`http` の URL、gif、webp、svg、それ以外の文字列、壊れた base64 は描きません。`null` はサポート外です。描かず、警告も出しません。`""` も同じです。ヘッダは読めても埋め込みに失敗した PNG / JPEG は、警告を 1 回出してスキップします。それ以外の無効な値は、値ごとに 1 回だけ次の警告を出します。

```text
[@pdfme/schemas/table] unsupported image in column N; only PNG/JPEG data URL is supported
```

サンプル画像は小さくしてください（目安 100KB 以下）。data URL はそのままテンプレートか inputs に入ります。

ヘッダのセルは、画像列でも常にテキストです。`cellType` が `null` のときはサポート外として、警告せずテキストとして扱います。この版が知らない列の種類（将来の `qrcode` など）はテキストとして扱い、その未知の値については 1 回だけ警告します。

古い pdfme は `cellType` を無視し、data URL をテキストとして表示します。

### 画像列を選ぶ

デザイナーでテーブルを選択します。**カラムスタイル**カードは列ごとに 1 ブロックです。名前は見出しです。見出しが空なら「列 N」になります。各ブロックでセルの種類、横寄せ、縦寄せを設定します。画像列では高さのモードも設定します。列が 7 以上のときは各ブロックが閉じた状態から始まり、1 行の要約に名前、種類、寄せを出します。6 列以下は開いたままで、折りたたみはありません。

- **テキスト**が既定です。未知の種類は、変更するまでテキストと表示します。
- **画像**にすると、その列の `cellType` が `"image"` になり、その列のボディセルはすべて空になります。見出しは変わりません。ヘッダのセルはテキストのままです。
- 列を初めて画像にしたとき、未設定なら `imageHeightMode: "fixed"` と `imageHeight: 20` を書き、`alignment` は未設定のときだけ `"center"` にします。すでに設定した揃えは残します。
- テキストに戻すと、その列の `cellType`、`imageHeightMode`、`imageHeight` を消します。空になったマップはキーごと消します。横寄せと縦寄せはそのままで、ボディセルは再び空になります。
- 横寄せは、その列の `columnStyles.alignment` だけを書きます。縦寄せは同じ形の `columnStyles.verticalAlignment` を書きます。どちらの値も、その列ではヘッダスタイルとボディスタイルより優先され、ヘッダにも効きます。未設定の列は、既存のヘッダとボディの揃えを変えません。画像セルの `objectPosition` もこの縦横の寄せに従います。列の削除や名前の変更では、`verticalAlignment` も他の列マップと同じように詰め直します。

画像列には高さのモードもあります。

- **固定高さ (mm)** は、すべての行で同じ画像の高さです。入力欄は保存された高さを表示し、未設定か 0 より大きい有限の数でないときは 20 を表示します。有限かつ 0 より大きくない値は書き込まず、表示を元に戻します。
- **自動（幅に合わせる）** は、縦横比から高さを決めます。固定と自動の切り替えは `imageHeightMode` だけを変え、ミリメートルの値は残します。

### 画像セルを編集する

画像列のボディセルをクリックします。デザイナーと、読み取り専用でないフォームでは、そのセルに**画像を選択**が出ます。値があるときだけ**画像を削除**が出て、セルを `""` にします。ファイル入力が受け付けるのは PNG と JPEG だけです。空の画像セルをクリックするとファイルダイアログを開きます。ブラウザが開かないときは、画像を選択を使ってください。解決できた PNG / JPEG はセルに表示します。空や無効な値は点線のプレースホルダです。

編集中でないセルは画像だけで、ボタンもファイル入力もありません。ヘッダはテキストのままです。読み取り専用のフォームとビューアも同じで、画像だけを表示し、カーソルは通常の矢印です。編集できる画像セルのカーソルはポインタです。

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
