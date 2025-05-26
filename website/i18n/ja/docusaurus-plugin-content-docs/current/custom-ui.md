# カスタムUI

`@pdfme/ui`はオプションを通じてテーマとラベルのカスタマイズが可能です。  
このページではこれらの要素をカスタマイズする方法を説明します。

_サンプルコードは[デザイナー](/docs/getting-started#designer)を使用していますが、[フォーム](/docs/getting-started#form)と[ビューワー](/docs/getting-started#viewer)も同じ方法でカスタマイズできます。_

## UIテーマ

pdfmeは内部的に[Ant Design](https://ant.design/)を使用しています。
Ant Designのテーマをpdfme UIに適用することができます。

テーマのカスタマイズ方法については[Ant Designのドキュメント](https://ant.design/docs/react/customize-theme)を参照してください。  
APIリファレンスは[こちら](https://ant.design/docs/react/customize-theme#api)をご覧ください。

```ts
new Designer({
  domContainer,
  template,
  options: {
    theme: {
      token: {
        colorPrimary: 'red',
      },
    },
  },
});
```

![](/img/custom-ui-theme.gif)

## UI言語とラベル

:::note
ラベルカスタマイズ機能はまだ実装されていません。
[Custom Label for UI #107](https://github.com/pdfme/pdfme/issues/107)
:::

言語を変更するには、`options`の`lang`を変更します。（`lang`のデフォルトは`en`です。）
現在、`'en', 'ja', 'ar', 'th', 'pl', 'it'`のみがサポートされています。
追加の言語をサポートするには、issueを作成するかプルリクエストを送信してください。

提供されているラベルの代わりにカスタムラベルを使用するには、`options`の`labels`を変更します。
サポートされているラベルについては、[この i18n.ts](https://github.com/pdfme/pdfme/blob/main/packages/ui/src/i18n.ts)を参照してください。

pdfmeはまず`options`から`lang`を読み込み、次に`options`の`labels`から読み込んで上書きします。

```ts
new Designer({
  domContainer,
  template,
  options: {
    lang: 'ja',
    labels: {
      fieldsList: '入力項目一覧ビュー', // 編集ボタンのラベルを上書き
      youCanCreateYourOwnLabel: '独自のラベルを作成できます', // カスタムプラグイン用の新しいラベルを追加
    },
  },
});
```

独自のラベルを作成し、プラグインからi18n関数を使用してラベルを取得します。Playgroundコードの[署名プラグイン](https://github.com/pdfme/pdfme/blob/main/playground/src/plugins/signature.ts)の実装を参照してください。

## UI最大ズームレベル

デフォルトでは、pdfmeは元のPDFサイズの最大200%までズームできます。
これを増やしたい場合は、新しい制限にしたいパーセンテージを`maxZoom`オプションとしてデザイナー、フォーム、またはビューワーに渡すことができます。
この値は100より大きく、25の倍数である必要があります。

```ts
new Designer({
  domContainer,
  template,
  options: {
    maxZoom: 400,
  },
});
```

## UIオプション

UIの状態をオプションで制御できます。

```javascript
// 特定の状態で初期化（FormやViewerでも同様に使えます）:
const designer = new Designer({
  domContainer,
  template,
  options: {
    zoomLevel: 1.5,
    sidebarOpen: false,  // （Designerのみ）
  }
});

// 初期化後に状態を更新:
designer.updateOptions({
  zoomLevel: 2,
  sidebarOpen: true
});
```
