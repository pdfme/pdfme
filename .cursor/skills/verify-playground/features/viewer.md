# Viewer

## Sub-features

- Read-only preview of the same template and inputs as Form.
- Zoom, fit, and page controls (`button.pdfme-ui-zoom-out`, `.pdfme-ui-pager`).
- **Designer** (`#open-designer`), language select, Inputs **Get** / **Set** / **Reset**, and `#generate-pdf`.

## How to get to it (user POV)

Open **Form/Viewer** so the address is `/form-viewer`. In the **Mode** group, click **Viewer**. The playground remembers that choice in `localStorage` under `mode`. Coming back to the tab reopens the Viewer until **Form** is clicked.

## Driving it with CDP

1. Go to `http://127.0.0.1:5193/form-viewer`.
2. Click the `<button>` whose trimmed text is exactly `Viewer`.
3. Wait until that button's class includes `bg-green-600` and `.pdfme-ui-zoom` has a percent label.
4. Confirm the preview root `.pdfme-designer-root` is on the page and that text fields are not `contenteditable`. Viewer mode fails `isEditable`, so the same invoice text that is editable in Form is not editable here.
5. Click `button.pdfme-ui-zoom-out` and read `.pdfme-ui-zoom` again. The step is the same `0.25` used on Designer (`100%` becomes `75%` from the default zoom).

## Gotchas

- There is no `/viewer` route. The tab id is `#form-viewer-nav` and the path is `/form-viewer` for both modes.
- The active mode is not in the URL. A screenshot has to show the green **Viewer** button, not only the path.
- `.pdfme-designer-canvas` and `.pdfme-designer-plugin-text` belong to Designer. They stay absent on this page. The shared class is `.pdfme-designer-root`, because Form and Viewer reuse that root component.
- **Get** / **Set** / **Reset** still run in viewer mode. **Set** opens `window.prompt`.
