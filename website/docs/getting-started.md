---
sidebar_position: 1
---

# Getting Started

:::caution

pdfme is now beta version. Please report any issues or suggestions from [Help page](/help) or [edit this page.](https://github.com/hand-dot/pdfme/tree/main/website/docs/getting-started.md)
:::

## Introduction

pdfme was created to simplify PDF generation and design. It is especially useful for the following use cases.

- Need to create a designed PDF with short code.
- Need to integrate PDF design features into applications.
- Need to create a large number of PDFs without compromising performance

As a example, the author's service [https://labelmake.jp/](https://labelmake.jp/) can create more than 100 varieties of PDFs and generates more than 100,000 PDF files per month.

## Installation

The operating requirements should be the node environment `>=14`.

Installation can be done with the following command.

```
npm i pdfme
```

The following type, function and classes are available in pdfme.

- [Template](/docs/getting-started#template)
- [generate](/docs/getting-started#generator)
- [Designer](/docs/getting-started#designer)
- [Form](/docs/getting-started#form)
- [Viewer](/docs/getting-started#viewer)

If your environment uses webpack, import the necessary items as shown below.

```ts
import { Template, generate, Designer, Form, Viewer } from 'pdfme';
```

**All objects use Template, which will be briefly explained in the next section.
**

## Template

The core of pdfme's library is Template. All objects use Template.  
A template can be divided into two parts: fixed and variable. They are called basePdf and schemas.
The following image is a good illustration of a template.

![](/img/template.png)

- **basePdf**: PDF data for the fixed part of the PDF to be generated.
- **schemas**: Definition data for the variable part of the PDF to be generated.

**basePdf** can be given a `string`(base64), `ArrayBuffer`, or `Uint8Array`. A blank A4 PDF can be imported with `blankPdf`. You can use it to check how it works.

**schemas** currently has the following types of data available

- text
- image
- Various types of barcodes

Let's take a look at some specific data.  
(If you are using TypeScript, you can import the Template type.)

```ts
import { Template, blankPdf } from 'pdfme';

const template: Template = {
  basePdf: blankPdf,
  schemas: [
    {
      a: {
        type: 'text',
        position: { x: 0, y: 0 },
        width: 10,
        height: 10,
      },
      b: {
        type: 'text',
        position: { x: 10, y: 10 },
        width: 10,
        height: 10,
      },
      c: {
        type: 'text',
        position: { x: 20, y: 20 },
        width: 10,
        height: 10,
      },
    },
  ],
};
```

[For more information, please refer to the API documentation of the Template type here](/docs/api/#template).

You can create a template from [Template Design page](/template-design). Or, if you want to integrate the template creation feature into your application, check out the [Designer section](/docs/getting-started#designer).

## Generator

The PDF generator function, `generate`, takes 2 arguments of `template` and `inputs` for generate a PDF. It works both in Node.js and in the browser.

The code to generate a PDF file using the [template created above](/docs/getting-started#template) is shown below.

```ts
import { Template, generate } from 'pdfme';

const template: Template = {
  // skip...　Check the Template section.
};
const inputs = [{ a: 'a1', b: 'b1', c: 'c1' }];

generate({ template, inputs }).then((pdf) => {
  console.log(pdf);

  // Browser
  // const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
  // window.open(URL.createObjectURL(blob));

  // Node.js
  // fs.writeFileSync(path.join(__dirname, `test.pdf`), pdf);
});
```

You can create a PDF file like the below.

![](/img/simplePdf.png)

Also, each element in the inputs array corresponds to a page in the PDF, you can create a multi-page PDF file by providing multiple elements of inputs.

[For more information, please refer to the API documentation of the generate function here](/docs/api/#generate).

## Designer

The Designer allows you to edit the Template schemas, making it easy for anyone to create Template json objects.

You can design your own template from [Template Design page](/template-design), or you can integrate the designer into your application.

Let's integrate the designer using the template created above as the default template.

```ts
import { Template, Designer } from 'pdfme';

const domContainer = document.getElementById('container');
const template: Template = {
  // skip...　Check the Template section.
};

const designer = new Designer({ domContainer, template });
```

The Designer class is instantiated as shown above, and the template designer is displayed in the `domContainer`.  
You can edit the template as shown below. The operation is like Google Slides, etc., so you can use common keyboard shortcuts.

![](/img/designer.gif)

The designer instance can be manipulated with the following methods.

- `saveTemplate`
- `updateTemplate`
- `getTemplate`
- `onChangeTemplate`
- `onSaveTemplate`
- `destroy`

[For more information, please refer to the API documentation of the Designer class here](/docs/api/classes/Designer#methods).

## Form

You can use templates to create forms and PDF viewers.

The Form creates a UI for the user to enter schemas based on the template.

```ts
import { Template, Form } from 'pdfme';

const domContainer = document.getElementById('container');
const template: Template = {
  // skip...
};
// This is initial data.
const inputs = [{ a: 'a1', b: 'b1', c: 'c1' }];

const form = new Form({ domContainer, template, inputs });
```

![](/img/form.gif)

The form instance has a method `getInputs` to get the user's input.

You can generate a PDF file based on the user's input by passing the data you get from `getInputs` as inputs to generate, as shown in the code below.

```ts
generate({ template, inputs: form.getInputs() }).then((pdf) => {
  const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
  window.open(URL.createObjectURL(blob));
});
```

[For more information, please refer to the API documentation of the Form class here](/docs/api/classes/Form#methods).

## Viewer

Viewing a PDF file in a mobile browser is a pain, because it doesn't display well in an iframe.

The Viewer is a byproduct of the Form development process, but it allows you to show your users a preview of the PDF file you will create.

Using the Viewer is basically the same as using the Form, except that user cannot edit it.

```ts
import { Template, Viewer } from 'pdfme';

const domContainer = document.getElementById('container');
const template: Template = {
  // skip...
};
const inputs = [{ a: 'a1', b: 'b1', c: 'c1' }];

const viewer = new Viewer({ domContainer, template, inputs });
```

![](/img/viewer.png)

[For more information, please refer to the API documentation of the Viewer class here](/docs/api/classes/Viewer#methods).

## Special Thanks

- [pdf-lib](https://pdf-lib.js.org/): Used in PDF generation.
- [PDF.js](https://mozilla.github.io/pdf.js/): Used in PDF viewing.
- [React](https://reactjs.org/): Used in building the UI.
- [react-moveable](https://daybrush.com/moveable/), [react-selecto](https://github.com/daybrush/selecto), [@scena/react-guides](https://daybrush.com/guides/): Used in Designer UI.
- [bwip-js](https://github.com/metafloor/bwip-js): Used in barcode generation.
- [zod](https://github.com/colinhacks/zod): Used in Validation.

I definitely could not have created pdfme without these libraries. I am grateful to the developers of these libraries.
