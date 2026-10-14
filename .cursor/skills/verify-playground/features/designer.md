# Designer

## Sub-features

- Blank or loaded template on a canvas (`.pdfme-designer-canvas`), with rulers and the page background inside `.pdfme-designer-root`.
- Field palette in `.pdfme-designer-left-sidebar`. Each plugin button is `.pdfme-designer-plugin-<type>`. Text is `.pdfme-designer-plugin-text`. The icon's `title` is the registry label (`Text`, `Table`, `QR`, and the other keys in `playground/src/plugins/index.ts`).
- Zoom and paging in `.pdfme-ui-control-bar`: Zoom out, Zoom in, Fit width, Fit height, and `.pdfme-ui-pager`.
- Right sidebar `.pdfme-designer-right-sidebar`. With nothing selected it shows `.pdfme-designer-list-view` ("Field List"). A selection shows `.pdfme-designer-detail-view`. Toggle: `.pdfme-designer-sidebar-toggle`.
- Playground actions: `#save-local`, `#save-as`, `#reset-template`, Static schema, JSON, Change PDF, `#open-form-viewer`, Template JSON download, `#generate-pdf`.

## How to get to it (user POV)

From any playground page, click the **Designer** tab in the top bar. The address becomes `/designer`. On the Templates gallery, a sample's thumbnail (`#template-img-<name>`, for example `#template-img-invoice`) or its **Designer** button opens that sample in the designer (`/designer?template=<name>`). **New Local Template** then **Blank** goes to `/designer?new=1`.

With a fresh browser profile and no saved project, `/designer` loads the invoice sample (`/template-assets/invoice/template.json`).

## Driving it with CDP

1. Go to `http://127.0.0.1:5193/designer`.
2. Wait until all of these exist: `#designer-nav` (its class includes `border-green-500` while the tab is active), `#open-form-viewer`, `.pdfme-designer-canvas`, `.pdfme-designer-plugin-text`, and `button.pdfme-ui-zoom-out`.
3. Read the percent inside `.pdfme-ui-zoom`. A fresh Designer starts at zoom `1`, so the label is `100%`.
4. Click `button.pdfme-ui-zoom-out` (`aria-label="Zoom out"`). The step is `0.25`, so the label becomes `75%`.
5. Screenshot before and after the click. Keep the console and the responses for this origin, including `/template-assets/invoice/template.json`.

`scripts/drive.sh` performs this sequence.

## Gotchas

- Palette buttons use `@dnd-kit` drag. A click on `.pdfme-designer-plugin-text` does not insert a field.
- `#generate-pdf` also exists on Form/Viewer. On Designer it is in the Output group next to **Template JSON**.
- `#open-form-viewer` is disabled while static-schema editing is on. If the template has unsaved workspace changes, the click opens the dialog "Save before opening Form/Viewer?" instead of navigating.
- Zoom-out is disabled at the minimum zoom (`0.25`, label `25%`). The English `aria-label` depends on `lang: 'en'`, which the playground sets when it constructs the Designer.
- The right sidebar starts closed on a narrow viewport. At 1366px it stays open.
