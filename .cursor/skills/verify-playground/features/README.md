# Playground features

The playground is the web UI served by `cd playground && npm run dev`. These are the user-facing flows. Library packages are what the pages render; they are not separate surfaces here.

| Feature | Route | File |
| --- | --- | --- |
| Designer | `/designer` | [designer.md](designer.md) |
| Form | `/form-viewer` (mode `form`) | [form.md](form.md) |
| Viewer | `/form-viewer` (mode `viewer`) | [viewer.md](viewer.md) |
| Templates | `/` and `/templates`, plus My Workspace at `/workspace` | [templates.md](templates.md) |
| JSX | `/jsx` | [jsx.md](jsx.md) |

`/md2pdf` is a sixth route (`#md2pdf-nav`, label `md2pdf`). It is the same shape as JSX: an h1 `md2pdf (beta)`, a Monaco editor `[aria-label="Markdown"]`, a pane labeled `Viewer`, and buttons `Save Project`, `Save As`, and `Generate PDF`. It is not a separate feature file.

Drive these with Chrome DevTools Protocol against the verification server on `http://127.0.0.1:5193`. Selectors are the ids, aria-labels, and class names in the playground and `@pdfme/ui` source.
