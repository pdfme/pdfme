# Custom UI

`@pdfme/ui` allows customization of themes and labels through options.  
This page explains how to customize these elements.

_Sample code uses the [Designer](/docs/getting-started#designer), but [Form](/docs/getting-started#form) and [Viewer](/docs/getting-started#viewer) can be customized in the same way._

## UI Theme

pdfme internally uses [Ant Design](https://ant.design/).
You can apply the Ant Design theme to the pdfme UI.

Refer to [Ant Design's documentation](https://ant.design/docs/react/customize-theme) for how to customize the theme.  
For the API reference, see [here](https://ant.design/docs/react/customize-theme#api).

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

## UI Language and Labels

:::note
The label customization feature is not yet implemented.
[Custom Label for UI #107](https://github.com/pdfme/pdfme/issues/107)
:::

To change the language, modify `lang` in `options`. (The default for `lang` is `en`.)
Currently, only `'en', 'ja', 'ar', 'th', 'pl', 'it'` are supported.
To support additional languages, create an issue or send a pull request.

To use custom labels instead of the provided ones, change `labels` in `options`.
For supported labels, refer to [this i18n.ts](https://github.com/pdfme/pdfme/blob/main/packages/ui/src/i18n.ts).

pdfme first loads `lang` from `options`, then reads and overrides from `options`' `labels`.

```ts
new Designer({
  domContainer,
  template,
  options: {
    lang: 'ja',
    labels: {
      fieldsList: '入力項目一覧ビュー', // override the label for the edit button
      youCanCreateYourOwnLabel: '独自のラベルを作成できます', // add a new label for the custom plugin
    },
  },
});
```

Create your own labels and use the i18n function from the plugin to retrieve the labels. Please refer to the implementation of the [Signature plugin](https://github.com/pdfme/pdfme/blob/main/playground/src/plugins/signature.ts) in the Playground code.
