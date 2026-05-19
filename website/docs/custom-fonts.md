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

const font: Font = {
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
    [
      {
        name: 'a',
        type: 'text',
        fontName: 'serif',
        position: { x: 0, y: 0 },
        width: 10,
        height: 10,
      },
      {
        name: 'b',
        type: 'text',
        fontName: 'sans_serif',
        position: { x: 10, y: 10 },
        width: 10,
        height: 10,
      },
      {
        // <- use fallback font. (serif)
        name: 'c',
        type: 'text',
        position: { x: 20, y: 20 },
        width: 10,
        height: 10,
      },
    ],
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

## Font weight and style

pdfme has two font systems that handle weight and style. Understanding which one to use will save you time:

| I want to… | Use |
|---|---|
| Make a whole text field bold, light, or italic | `fontWeight` / `fontStyle` |
| Use different fonts for `**bold**` and `*italic*` within one field | `fontVariants` (requires inline-markdown) |

---

## `fontWeight` and `fontStyle`

These properties apply to the **whole field**. Set them on a text schema and pdfme renders the entire field in that weight and style — in both the Designer preview and the generated PDF.

```ts
{
  name: 'heading',
  type: 'text',
  fontName: 'Roboto',
  fontWeight: 700,       // the whole field is bold
  fontStyle: 'italic',   // the whole field is italic
}
```

### How font files are resolved

Rather than CSS-only synthesis, pdfme looks up the actual font file using a `<fontName>[_<style>][_<weight>]` naming convention. Register your font variants with that naming pattern and pdfme will use the correct file automatically.

| `fontStyle` | `fontWeight`      | Resolved registry key   |
|-------------|-------------------|-------------------------|
| `normal`    | `400` (default)   | `Roboto`                |
| `normal`    | `700` or `'bold'` | `Roboto_700` / `Roboto_bold` |
| `italic`    | `400` (default)   | `Roboto_italic`         |
| `italic`    | `700` or `'bold'` | `Roboto_italic_700` / `Roboto_italic_bold` |

Default values (`normal` style, `400` weight) are omitted from the suffix, so plain `Roboto_700` registrations are valid without any migration.

### Registering weight and style variants

```ts
const font: Font = {
  Roboto: {
    data: 'https://example.com/fonts/Roboto-Regular.ttf',
    fallback: true,
  },
  Roboto_300: {
    data: 'https://example.com/fonts/Roboto-Light.ttf',
  },
  Roboto_700: {
    data: 'https://example.com/fonts/Roboto-Bold.ttf',
  },
  Roboto_italic: {
    data: 'https://example.com/fonts/Roboto-Italic.ttf',
  },
  Roboto_italic_700: {
    data: 'https://example.com/fonts/Roboto-BoldItalic.ttf',
  },
};
```

Each key is a separate entry in the flat font map — pdfme joins them automatically when `fontWeight`/`fontStyle` are set on a schema.

### Keyword weights

`fontWeight` accepts numeric values (`100`–`900`) or keyword strings:

| Keyword | Numeric |
|---------|---------|
| `'thin'` | 100 |
| `'extralight'` | 200 |
| `'light'` | 300 |
| `'normal'` | 400 |
| `'medium'` | 500 |
| `'semibold'` | 600 |
| `'bold'` | 700 |
| `'extrabold'` | 800 |
| `'black'` | 900 |

The keyword is used verbatim as the suffix when looking up the registry key, so `fontWeight: 'bold'` looks up `Roboto_bold`, not `Roboto_700`. Register under exactly one name.

### Fallback

When the resolved candidate is not registered, pdfme silently falls back to the base font and additionally sets CSS `font-weight` / `font-style` on the UI element so the browser can synthesize the appearance.

---

## `fontVariants` (inline-markdown only)

`fontVariants` is only relevant when `textFormat: 'inline-markdown'` is enabled. It lets you specify a different registered font for each inline markup style — **bold**, *italic*, ***bold-italic***, and `code` — within a single field.

```ts
{
  name: 'body',
  type: 'text',
  textFormat: 'inline-markdown',
  fontName: 'Roboto',              // base font for plain text
  fontVariants: {
    bold: 'Roboto_700',            // font for **bold** runs
    italic: 'Roboto_italic',       // font for *italic* runs
    boldItalic: 'Roboto_italic_700',
    code: 'RobotoMono',
  },
}
```

Each value in `fontVariants` is an explicit registered font name — there is no auto-resolution by convention. If a variant is omitted, pdfme uses the base `fontName` for that run type (with synthetic bold/italic applied in the UI as needed).

`fontVariants` is configured in the Designer under the **Markdown Fonts** section, which appears when inline-markdown is enabled for a field.

---

## Using both together

`fontWeight`/`fontStyle` and `fontVariants` are independent systems that compose cleanly. `fontWeight`/`fontStyle` set the base for the whole field; `fontVariants` overrides specific run types on top of that base.

```ts
{
  name: 'article',
  type: 'text',
  textFormat: 'inline-markdown',
  fontName: 'Roboto',
  fontWeight: 300,                  // whole field renders light
  fontVariants: {
    bold: 'Roboto_700',             // **bold** runs use the 700 weight
    boldItalic: 'Roboto_italic_700',
  },
}
```

In this example plain text renders in `Roboto_300` (light), while `**bold**` runs render in `Roboto_700`.
