# Custom Fonts

pdfme uses the helvetica font by default, but you can use any font you like.

## About Font type

```ts
type Font = {
  [fontName: string]: {
    data: Uint8Array | ArrayBuffer;
    fallback?: boolean;
    subset?: boolean;
  };
}
```
- *`fallback`: Setting it to true makes it the font to use if not set to a `fontName`. Only one of the font objects must be set to true.
- *`subset`: The default is true, but it can be set to false to set the font embedding to not subset. (This setting is for a bug in fontkit when embedding certain fonts with subsetting.)

Please read font data by fetch or fs.readFileSync as below.
```ts
const font: Font = {
  serif: {
    data: await fetch('fonts/serif.ttf').then((res) => res.arrayBuffer()),
    fallback: true,
  },
  sans_serif: {
    data: fs.readFileSync("fonts/sans_serif.ttf"),
  },
};
```

## How to set font

Let's check out how to set font in the generator and ui packages.

### Generator

Set font as option in [generate](/docs/getting-started#generator) function

```ts
import { Template, BLANK_PDF, generate } from '@pdfme/generator';

const font = {
  serif: {
    data: await fetch('fonts/serif.ttf').then((res) => res.arrayBuffer()),
    fallback: true,
  },
  sans_serif: {
    data: fs.readFileSync("fonts/sans_serif.ttf"),
  },
}
const template: Template = {
  basePdf: BLANK_PDF,
  schemas: [
    {
      a: {
        type: 'text',
        fontName: 'serif',
        position: { x: 0, y: 0 },
        width: 10, height: 10,
      },
      b: {
        type: 'text',
        fontName: 'sans_serif',
        position: { x: 10, y: 10 },
        width: 10, height: 10,
      },
      c: { // <- use fallback font. (serif)
        type: 'text',
        position: { x: 20, y: 20 },
        width: 10, height: 10,
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
import { Designer } from "@pdfme/ui";

const domContainer = document.getElementById('container');
const template = {
  // skip...
}
const font = {
  serif: {
    data: await fetch('fonts/serif.ttf').then((res) => res.arrayBuffer()),
    fallback: true,
  },
  sans_serif: {
    data: await fetch('fonts/sans_serif.ttf').then((res) => res.arrayBuffer()),
  },
}

const designer = new Designer({ domContainer, template, options: { font } });
```

#### Update fonts with `updateOptions`.

```ts
const font = {
  serif: {
    data: await fetch('fonts/serif.ttf').then((res) => res.arrayBuffer()),
  },
  sans_serif: {
    data: await fetch('fonts/sans_serif.ttf').then((res) => res.arrayBuffer()),
    fallback: true,
  },
}
designer.updateOptions({ font });
```
