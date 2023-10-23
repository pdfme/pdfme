# Custom Schemas

:::caution

This feature is still in beta. The specifications may change in future versions.  
If you encounter bugs, issues, or have suggestions, please report them through [GitHub](https://github.com/pdfme/pdfme/issues/new/choose).

:::

By default, pdfme allows you to use a text schema. However, some users may want to utilize schemas for images or QR codes.
These can be loaded as plugins from the `@pdfme/schemas` package.

You can also create your own schemas and load them similarly as plugins.
This page explains how to use schemas from `@pdfme/schemas` and how to create your own.

## Using Schemas from @pdfme/schemas

Here, we explain how to import image and QR code schemas from `@pdfme/schemas`.

First, install `@pdfme/schemas`.

```bash
npm install @pdfme/schemas
```

Next, import the required schemas from `@pdfme/schemas` to `@pdfme/generator` and `@pdfme/ui`.

The following code shows an example of importing QR code and image schemas from `@pdfme/generator` and `@pdfme/ui`.

```ts
import type { Template } from '@pdfme/common';
import { barcodes, image } from '@pdfme/schemas';
import { generate } from '@pdfme/generator';

const template: Template = {
  // skip...
};
const inputs = [{ a: 'a1', b: 'b1', c: 'c1' }];

const pdf = await generate({
  template,
  inputs,
  // ↓ You can use plugins in Generator.
  plugins: {
    image,
    qrcode: barcodes.qrcode,
  },
});
```

In this `@pdfme/ui` example, we're using the Designer, but you can load plugins in the Form and Viewer in the same way.

```ts
import type { Template } from '@pdfme/common';
import { barcodes, image } from '@pdfme/schemas';
import { Designer } from '@pdfme/ui';

const domContainer = document.getElementById('container');
const template: Template = {
  // skip...
};

const designer = new Designer({
  domContainer,
  template,
  // ↓ You can use plugins in Designer.
  plugins: {
    image,
    qrcode: barcodes.qrcode,
  },
});
```

By loading image and qrcode as plugins, you can render schemas of type image and qrcode found in your template's schemas.

## Creating Your Own Schemas

<!--
FIXME from here

まずは pdf, ui, propPanel の概念を説明する
また、uiのモードについても説明する
  基本的にフォームと同じだが、designerの時はレンダリング時にフォーカスをするようにしたりすることができる

-->
