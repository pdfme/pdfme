## @pdfme/ui

This library provides the following classes, which can be integrated into applications built with any framework:

- `Designer`: A WYSIWYG editor for designing templates.
- `Form`: A form based on templates for collecting input data.
- `Viewer`: A viewer for displaying PDF files generated with [@pdfme/generator](https://www.npmjs.com/package/@pdfme/generator) using templates and input data.

The published `@pdfme/ui` package ships as a standalone bundle, so consumers do not need to install `react` or `react-dom` separately just to use these classes.

### Designer Sidebar Widths

Set sidebar widths in pixels through the Designer options:

```ts
const designer = new Designer({
	domContainer,
	template,
	options: {
		leftSidebarWidth: 100,
		rightSidebarWidth: 450,
	},
});
```

Both options accept positive finite numbers. When omitted, the left sidebar defaults to 45px and the right sidebar to 400px. The canvas layout and sidebar collapse behavior use the configured widths.

For the complete documentation of pdfme, please refer to [this link](https://pdfme.com/docs/getting-started).
