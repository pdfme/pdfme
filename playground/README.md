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

## How to Add Templates to the List

The `playground/public/templates` directory contains sample templates, which are used at [https://pdfme.com/templates](https://pdfme.com/templates) and [https://playground.pdfme.com/templates](https://playground.pdfme.com/templates).

Follow these steps to add a sample template:
1. Create a directory with a **kebab-case** name inside `playground/public/templates`.
   - This template name will be converted from kebab-case and displayed in the template selection screen.
2. Place a `template.json` file inside the directory you created.
   - You can create this template using [https://pdfme.com/template-design](https://pdfme.com/template-design) or [https://playground.pdfme.com](https://playground.pdfme.com).
3. At the root of the `playground` directory, run either `npm run generate-template-assets` or `npm run build`.
   - This will generate the template list data and thumbnail images.