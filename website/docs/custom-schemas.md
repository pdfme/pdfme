# Custom Schemas(Plugins)

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
import { text, image, barcodes } from '@pdfme/schemas';
import { generate } from '@pdfme/generator';

const template: Template = {
  // skip... you can use text, image, qrcode schema type in template.
};
const inputs = [
  // skip...
];

const pdf = await generate({
  template,
  inputs,
  // ↓ You can use plugins in Generator like this.
  plugins: {
    text,
    image,
    qrcode: barcodes.qrcode,
  },
});
```

In this `@pdfme/ui` example, we're using the Designer, but you can load plugins in the Form and Viewer in the same way.

```ts
import type { Template } from '@pdfme/common';
import { text, image, barcodes } from '@pdfme/schemas';
import { Designer } from '@pdfme/ui';

const domContainer = document.getElementById('container');
const template: Template = {
  // skip... you can use text, image, qrcode schema type in template.
};

const designer = new Designer({
  domContainer,
  template,
  // ↓ You can use plugins in Designer like this.
  plugins: {
    text,
    image,
    qrcode: barcodes.qrcode,
  },
});
```

By loading image and qrcode as plugins, you can render schemas of type image and qrcode found in your template's schemas.

![](/img/custom-schemas.png)

:::tip

Using plugins from Designer, you can override the default schema to remove text, replace it with custom schema, or rename label, rearrange the order.

```ts
  plugins: {
    QR: barcodes.qrcode,
    Image: image,
  },
```

![](/img/custom-schemas-tips.png)
:::

## Creating Your Own Schemas

Next, we will introduce the method for those who want to create their own schemas.  
If you have created a schema or have an idea for one, please share it on [GitHub Discussions](https://github.com/pdfme/pdfme/discussions/288).  
We believe that since pdfme is developed as open-source, everyone should be able to share and develop schemas together.

### Overview of Custom Schemas / Plugins

Custom schemas consist of three elements, which are collectively referred to as plugins.  
The type definitions for plugins are defined within the [packages/common/src/types.ts](https://github.com/pdfme/pdfme/blob/main/packages/common/src/types.ts) file.

We will explain how the **Plugin** is structured and how it operates.

- **pdf**: Used in `@pdfme/generator`, it includes code for rendering schemas into PDFs. The PDF rendering process is handled by [pdf-lib](https://pdf-lib.js.org/).
- **ui**: Used in `@pdfme/ui`, it includes code for rendering schemas into the DOM. The ui has the following modes:
  - **viewer**: Utilized in [Viewer](/docs/getting-started#viewer), [Designer](/docs/getting-started#designer) (when no field is selected). Functions as a preview by matching the rendering and appearance of the PDF.
  - **form**: Utilized in [Form](/docs/getting-started#form). Functions as a form that users can input into.
  - **designer**: Utilized in [Designer](/docs/getting-started#designer) (when a field is double-clicked). Basically the same as the form but serves as a WYSIWYG editor where users can input. For textarea and input elements, focusing is required.
- **propPanel**: Used in `@pdfme/ui`'s [Designer](/docs/getting-started#designer), it allows you to add custom property editing forms to the sidebar when a field is selected. You can fill it out using [form-render](https://xrender.fun/form-render)'s JSON format (widget extensions are also possible).

:::note
pdfme relies on [pdf-lib](https://pdf-lib.js.org/) and [form-render](https://xrender.fun/form-render).  
These libraries are manipulated through plugins to achieve their functionalities within pdfme.  
Please refer to the documentation of the above libraries as needed.
:::

The images below highlight where the pdf, ui, and propPanel of the plugin are used.

- **pdf**
  ![](/img/plugin-pdf.png)
- **ui(mode: viewer), ui(mode: form)**
  ![](/img/plugin-preview.png)
- **ui(mode: designer), ui(mode: viewer), propPanel**
  ![](/img/plugin-designer.png)

### Learning How to Create from @pdfme/schemas' Code

If you're looking to create your own schema, it is recommended to refer to the existing code within `@pdfme/schemas` while doing so.  
The code for existing schemas can be found in the files below:

- [packages/schemas/src/text/index.ts](https://github.com/pdfme/pdfme/tree/main/packages/schemas/src/text/index.ts): The most complex schema in terms of PDF rendering. The propPanel is also customized using [form-render's Widget](https://xrender.fun/form-render/advanced-widget), demonstrating that the plugin can meet complex needs.
- [packages/schemas/src/graphics/image.ts](https://github.com/pdfme/pdfme/blob/main/packages/schemas/src/graphics/image.ts): Simple implementation for PDF rendering, but uses an input type="file" element for image input during ui(mode: form) and ui(mode: designer) rendering. Overall, it’s a simple implementation and may serve as a good starting point.
- [packages/schemas/src/barcodes/index.ts](https://github.com/pdfme/pdfme/tree/main/packages/schemas/src/barcodes/index.ts): Cool for generating barcodes in real-time for ui preview, and shares that module with pdf. Also, supports more than 10 types of barcodes and changes the form in the propPanel according to the type of barcode. Demonstrates that the plugin can be both flexible and efficient.

:::tip

- If `PropPanel.defaultSchema.rotate` is not set or is undefined, the rotate handle will disappear from the Designer.
- If rotation is not required, it's efficient to skip its implementation in PDF rendering.

:::

### Sample Scenario for Creating a Signature Plugin

As a sample scenario, let's try creating a plugin that allows you to input signatures in the form.  
Specifically, it should be possible to input the signature using [signature_pad](https://github.com/szimek/signature_pad), and to render that signature as an image in both the DOM and PDF.

[![](/img/signature-schema.gif)](https://playground.pdfme.com/)

- Demo: https://playground.pdfme.com/
- Code: [pdfme-playground/src/plugins/signature.ts](https://github.com/pdfme/pdfme-playground/blob/main/src/plugins/signature.ts)


### Caveats for writing Custom Schemas

#### Renderer schema caching

pdfme supports caching of memory or cpu-intensive content so that it can be re-used within the same rendering process.

The most common use-case for this is when you're rendering a large number of PDFs with the same template. Often these
inputs might be the same and your schema could benefit from caching them. This is optional, but if you're intending for your custom schema to be used by others then you should consider it.

Examples of caching are available in both [image](https://github.com/pdfme/pdfme/blob/main/packages/schemas/src/graphics/image.ts) and [barcode](https://github.com/pdfme/pdfme/blob/main/packages/schemas/src/barcodes/pdfRender.ts) schema render functions. You will need to choosing a caching key that captures the uniqueness of your generated PDF artifact (excluding attributes such as size and position, which are usually handled by pdf-lib on rendering). You will notice in the barcode schema that it requires more attributes to describe it's uniqueness compare to images which use the default `getCacheKey` function.
