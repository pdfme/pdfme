# Expression

Expression は `{}` で囲まれた式を評価する機能です。例えば、下記のようなテンプレートがあった場合、

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
                "content": "{field1} !", // Expression!
                ...
                "required": false,
                "readOnly": true,
            }
        ]
    ],
    "basePdf": { "width": 210, "height": 297, "padding": [20, 10, 20, 10] },
    "pdfmeVersion": "5.0.0"
}
```

このようにレンダリングされます。

![expression](/img/expression.png)

つまり、`{field1}` は `field1` の値に置き換えられます。


## ユースケース

### フッター、ヘッダーの動的な表示

### ユーザーの入力を再利用して表示する

### 値を一箇所で管理する


##  使い方、仕様

### エクスプレッションを使う方法

### どのようなことがサポートされているか

### エクスプレッションの制限事項

###　エクスプレッション内で使える変数
  - page
  - total
  - date(YYYY/MM/DD)
  - dateTime(YYYY/MM/DD HH:mm)

### セキュリティについて