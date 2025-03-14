# 式（Expression）

式は`{}`で囲まれた表現を評価する機能です。  
最も単純な例は`{1+1}`で、これは`2`と評価されます。

pdfmeでは、式は単純な計算だけでなく、ユーザー入力を活用することもできます。

例えば、以下のようなテンプレートを考えてみましょう：

```
{
    "schemas": [
        [
            {
                "name": "field1",
                "type": "text",
                "content": "Hello world",
                ...
                "readOnly": false,
            },
            {
                "name": "field2",
                "type": "text",
                "content": "{field1} !", // 式！
                ...
                "readOnly": true,
            }
        ]
    ],
    "basePdf": { "width": 210, "height": 297, "padding": [20, 10, 20, 10] },
    "pdfmeVersion": "5.0.0"
}
```

`field2`の値は`Hello world !`になります。式`{field1} !`は以下のように評価されます：

![expression](/img/expression.png)

これは、`{field1}`が`field1`の値に置き換えられ、その後に`!`が追加されることを意味します。

## ユースケース

以下のようなユースケースが考えられます：

### フッターとヘッダーに日付やページ番号を表示する

例えば、PDFの作成日をヘッダーに表示したり、フッターにページ番号を表示したりすることができます。ヘッダーとフッターについては[こちら](/docs/headers-and-footers)で詳しく説明されていますが、ヘッダーとフッターに使用される`staticSchema`でも式を使用できます。

### ユーザー入力を表示用に再利用する

ユーザーが入力した値を表示用に再利用できます。例えば、ユーザーが入力した`firstName`と`lastName`というフィールドがある場合、それらを連結して`{firstName + " " + lastName}`として表示できます。

これにより、ユーザーが類似の情報を複数回入力する必要がなくなり、使いやすさが向上します。

### 値を一箇所で管理する

式を使用することで、値を一箇所で管理できます。例えば、`taxRate`という値がある場合、`taxRate`を変更するだけで、それが使用されているすべての場所に反映され、変更が容易になります。

## 使用方法、仕様

概要とユースケースを理解した後、具体的な使用方法と仕様について説明します。

### 式の使用方法

式は、`readOnly`プロパティが`true`に設定されている場合に`schema`プロパティで使用できます。デザイナーから、`Editable`チェックボックスをオフにすることで`readOnly`を設定できます。

以下のGIFに示すように、`Editable`チェックボックスをオフにすることで式の使用を開始できます。

![Change ReadOnly](/img/expression-change-readOnly.gif)

つまり、式が使用されているフィールドはユーザーが編集できません。

### 式の制限とセキュリティ

- アロー関数のみがサポートされています。
- `eval`関数は使用できません。
- `prototype`は使用できません。
- 以下のグローバルオブジェクトとそのメソッドのみが使用できます：
  - Math
  - String
  - Number
  - Boolean
  - Array
  - Object
  - Date
  - JSON
  - isNaN
  - parseFloat
  - parseInt
  - decodeURI
  - decodeURIComponent
  - encodeURI
  - encodeURIComponent

詳細な仕様については、[この実装](https://github.com/pdfme/pdfme/blob/main/packages/common/src/expression.ts)を参照してください。

### 式内で使用できる変数

- **ユーザー入力値**
  - [複数変数テキスト](/docs/supported-features#multivariable-text)や[テーブル](/docs/supported-features#table)に入力された値で、JSONとして解析できるものは解析後に使用できます。
- **他の`readOnly`フィールドの値**
  - 別の`readOnly`フィールドの値に式が使用されている場合、式が評価された後の値が使用されます。
- **組み込み変数**
  - `currentPage`
  - `totalPages`
  - `date (YYYY/MM/DD)`
  - `dateTime (YYYY/MM/DD HH:mm)`

### 式の例

以下は使用できる式の例です：

- **小計:** `'{orders.reduce((sum, item) => sum + parseFloat(item[1] || 0) * parseFloat(item[2] || 0), 0)}'`
- **税額:** `'{Number(subtotalInput) * Number(tax.rate) / 100}'`
- **合計:** `'${Number(subtotal) + Number(tax)}'`
