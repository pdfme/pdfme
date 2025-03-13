# ヘッダーとフッター

ヘッダーやフッターのような、すべてのページに表示され、ページ区切りの影響を受けない要素を配置することができます。

特に、[動的テーブル](/docs/tables)のようにページ区切りが発生する場合、この機能を使用してデータによって押し下げられない要素を配置することができます。

簡単にするために、これらをヘッダーとフッターと表現しています。実際には、`basePdf`に`staticSchema`というプロパティを追加することで、すべてのページに表示され、ページ区切りの影響を受けない要素を配置することができます。

:::warning

この機能は、`basePdf`が既存のPDFを指定している場合には使用できません。`basePdf`が`{ width: number, height: number, padding: [number, number, number, number] }`型のプロパティで指定されている場合にのみ使用できます。

:::

## フッターの例

請求書テンプレートのフッターセクションを例に説明しましょう。

```json
{
  "width": 210,
  "height": 297,
  "padding": [20, 20, 20, 20],
  "staticSchema": [
    {
      "name": "line",
      "type": "line",
      "position": {
        "x": 20,
        "y": 279
      },
      "width": 170,
      "height": 0.2,
      "rotate": 0,
      "opacity": 1,
      "color": "#999999",
      "required": false,
      "readOnly": true,
      "content": ""
    },
    {
      "name": "footerInfo",
      "type": "text",
      "content": "Invoice No.{info.InvoiceNo} • {totalInput} USD due {date}",
      "position": {
        "x": 20,
        "y": 282
      },
      "width": 122.51,
      "height": 10,
      "rotate": 0,
      "alignment": "left",
      "verticalAlignment": "middle",
      "fontSize": 13,
      "lineHeight": 1,
      "characterSpacing": 0,
      "fontColor": "#000000",
      "backgroundColor": "",
      "opacity": 1,
      "strikethrough": false,
      "underline": false,
      "required": false,
      "readOnly": true
    },
    {
      "name": "pageNumber",
      "type": "text",
      "content": "Page {currentPage} of {totalPages}",
      "position": {
        "x": 145,
        "y": 282
      },
      "width": 45,
      "height": 10,
      "rotate": 0,
      "alignment": "right",
      "verticalAlignment": "middle",
      "fontSize": 13,
      "lineHeight": 1,
      "characterSpacing": 0,
      "fontColor": "#000000",
      "backgroundColor": "",
      "opacity": 1,
      "strikethrough": false,
      "underline": false,
      "required": false,
      "readOnly": true
    }
  ]
}
```

特筆すべきは、各スキーマの`content`に`{info.InvoiceNo}`や`{totalInput}`のような変数を指定できることです。これらの値は`input`で指定されたデータから取得されます。つまり、`staticSchema`内で`input`で指定されたデータを参照することができます。

使用可能な変数については、[こちら](/docs/expression#variables-that-can-be-used-within-expressions)の式のドキュメントを参照してください。

![footer](/img/footer.png)

## ヒント/注意点

- パディング内に要素を配置することで、ページ区切りが発生したときに押し下げられる要素と重ならずに表示することができます。
- `staticSchema`内のスキーマの`type`は、通常のテンプレートの`schemas`と同じタイプを指定できます。
- 現在、`staticSchema`内のスキーマはデザイナーで編集できません。
