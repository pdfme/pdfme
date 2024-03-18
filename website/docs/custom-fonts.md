# Custom Fonts

pdfme uses the [Roboto Regular 400](https://fonts.google.com/specimen/Roboto) font by default, but you can use any font you like.

To prioritize design, you can use your favorite fonts, and if you're using characters not included in the default Roboto font, such as Japanese or Chinese characters, they will be rendered as [Tofu](https://fonts.google.com/knowledge/glossary/tofu) in the PDF.

You can use this feature to solve those issues.

## About Font type

You can import from `@pdfme/common` as below.

```ts
import type { Font } from '@pdfme/common';
```

The type of font is as follows.

```ts
type Font = {
  [fontName: string]: {
    data: string | Uint8Array | ArrayBuffer;
    fallback?: boolean;
    subset?: boolean;
  };
};
```
- `data`: If you register a `string` starting with `http`, it will be automatically fetched.Or set binary data directly like `Uint8Array | ArrayBuffer`
- \*`fallback`: Setting it to true makes it the font to use if not set to a `fontName`. **Only one of the font objects must be set to true.**
- \*`subset`: The default is true, but it can be set to false to set the font embedding to not subset. (This setting is for a bug in fontkit when embedding certain fonts with subsetting.)

```ts
const font: Font = {
  serif: {
    data: 'https://example.com/fonts/serif.ttf',
    fallback: true,
  },
  sans_serif: {
    data: 'https://example.com/fonts/sans_serif.ttf',
  },
};
```

## How to set font

Let's check out how to set font in the generator and ui packages.

### Generator

Set font as option in [generate](/docs/getting-started#generator) function

```ts
import { Template, BLANK_PDF, Font } from '@pdfme/common';
import { generate } from '@pdfme/generator';

const font = {
  serif: {
    data: 'https://example.com/fonts/serif.ttf',
    fallback: true,
  },
  sans_serif: {
    data: 'https://example.com/fonts/sans_serif.ttf',
  },
};
const template: Template = {
  basePdf: BLANK_PDF,
  schemas: [
    {
      a: {
        type: 'text',
        fontName: 'serif',
        position: { x: 0, y: 0 },
        width: 10,
        height: 10,
      },
      b: {
        type: 'text',
        fontName: 'sans_serif',
        position: { x: 10, y: 10 },
        width: 10,
        height: 10,
      },
      c: {
        // <- use fallback font. (serif)
        type: 'text',
        position: { x: 20, y: 20 },
        width: 10,
        height: 10,
      },
    },
  ],
};
const inputs = [{ a: 'a1', b: 'b1', c: 'c1' }];

generate({ template, inputs, options: { font } }).then((pdf) => {
  console.log(pdf);

  // Browser
  // const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
  // window.open(URL.createObjectURL(blob));

  // Node.js
  // fs.writeFileSync(path.join(__dirname, `test.pdf`), pdf);
});
```

### UI

There are two ways to set fonts in the UI. instance initialization and through method.  
The sample code is for [Designer](/docs/getting-started#designer), but the same way can be used for [Form](/docs/getting-started#form) and [Viewer](/docs/getting-started#viewer).

#### Setting font at instance initialization

```ts
import { Designer } from '@pdfme/ui';

const domContainer = document.getElementById('container');
const template = {
  // skip...
};
const font = {
  serif: {
    data: 'https://example.com/fonts/serif.ttf',
    fallback: true,
  },
  sans_serif: {
    data: 'https://example.com/fonts/sans_serif.ttf',
  },
};

const designer = new Designer({ domContainer, template, options: { font } });
```

#### Update fonts with `updateOptions`.

```ts
const font = {
  serif: {
    data: 'https://example.com/fonts/serif.ttf',
  },
  sans_serif: {
    data: 'https://example.com/fonts/sans_serif.ttf',
    fallback: true,
  },
};
designer.updateOptions({ font });
```
