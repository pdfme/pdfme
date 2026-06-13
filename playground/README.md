This repository is a playground and development environment for the https://github.com/pdfme/pdfme library.
It can be started with the following command.

root directory

```
$ npm install
$ npm run build
```

playground directory

```cmd
$ npm install
$ npm run dev
```

If you are developing a pdfme library, please refer to the following document.
https://github.com/pdfme/pdfme/blob/main/DEVELOPMENT.md

---

## How to Add Sample Templates

The `playground/public/template-assets` directory is the source of the sample template gallery used by the playground.

Each gallery item is a directory under `playground/public/template-assets/<template-name>/`.

### Designer templates

Use this flow for normal pdfme templates:

1. Create a kebab-case directory in `playground/public/template-assets`.
   - Example: `playground/public/template-assets/invoice-blue`.
2. Put `template.json` in that directory.
   - You can create it with the playground Designer and download the Template JSON.
3. Add gallery metadata in `playground/public/template-assets/<template-name>/metadata.json`.

Example:

```json
{
  "order": 200,
  "description": "A blue invoice variant for a more branded business document.",
  "tags": ["Invoice", "Business", "Table"]
}
```

Supported metadata fields:

- `title`: optional display title. If omitted, the directory name is converted from kebab-case.
- `order`: optional gallery sort order. Lower numbers appear first; leave gaps such as `10`,
  `20`, and `30` so new templates can be inserted later. Templates without `order` appear after
  ordered templates and are sorted by title/name.
- `description`: short card description shown in the template gallery.
- `tags`: filter tags shown on the card and in the gallery filter.
- `sourceKind`: optional generation kind. Use `"designer"`, `"jsx"`, or `"md2pdf"`. Normal `template.json` samples can omit this; they default to `"designer"`.
- `status`: optional publish status. Use `"draft"` to keep the template files available by direct
  URL while excluding the template from the gallery `index.json`; omit it or use `"published"` for
  gallery templates.

Template metadata is validated during asset generation. Every template directory with a
`template.json` must have metadata, and metadata entries without a matching template directory fail
the build.

### JSX and md2pdf starters

JSX and md2pdf starters live in the same `template-assets` gallery. Their source is stored beside
the generated template so the source, metadata, thumbnail, and generated `template.json` move
together.

- JSX starters use `playground/public/template-assets/<starter-name>/source.tsx`.
- md2pdf starters use `playground/public/template-assets/<starter-name>/source.md`.
- Add `metadata.json` in the same directory with `sourceKind: "jsx"` or `sourceKind: "md2pdf"`.
- Use names such as `jsx-invoice` or `md2pdf-overview` so the gallery type can also be inferred.
- Give generated starters a human-readable `title`; otherwise the gallery falls back to the
  directory name.
- Use `order` when a starter should appear in the first screen of the gallery.

Example:

```json
{
  "title": "Invoice layout",
  "description": "A two-page invoice generated from JSX authoring source.",
  "sourceKind": "jsx",
  "tags": ["Invoice", "Business", "Table"]
}
```

### Regenerate assets

After changing templates or metadata, run this from the `playground` directory:

```bash
npm run generate-template-assets
```

This command:

- generates JSX/md2pdf starter `template.json` files,
- regenerates `index.json`,
- creates or updates `thumbnail.png` for each template.

`npm run dev` and `npm run build` also run this command automatically.

Before committing, include the updated template directory and metadata files. The generated
`index.json`, thumbnail PNGs, and hash-map cache files are intentionally ignored.
