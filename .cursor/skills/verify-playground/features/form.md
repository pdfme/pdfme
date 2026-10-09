# Form

## Sub-features

- The same preview chrome as Viewer: `.pdfme-designer-root`, `.pdfme-ui-control-bar`, zoom buttons, and `.pdfme-ui-pager`.
- Editable fields. Text fields that are not `readOnly` are `contenteditable` inside `.selectable` (`isEditable` is true only when mode is `form`).
- Mode switch, Inputs (**Get**, **Set**, **Reset**), language `<select>`, **Designer** (`#open-designer`), and **Generate PDF** (`#generate-pdf`).

## How to get to it (user POV)

Click the **Form/Viewer** tab. The address is `/form-viewer`. In the bar under the tabs, the **Mode** group has **Form** and **Viewer**. Click **Form**. The first visit with an empty `localStorage` key `mode` already opens in form mode. From Designer, **Form/Viewer** (`#open-form-viewer`) comes here. From a template card, **Form/Viewer** opens `/form-viewer?template=<name>`.

## Driving it with CDP

1. Use a fresh Chrome profile so `localStorage.mode` is unset, or set it by clicking the button.
2. Go to `http://127.0.0.1:5193/form-viewer`.
3. Click the `<button>` whose trimmed text is exactly `Form`. There is no id on that button. After the click, that button's class includes `bg-green-600` (the `primary` variant). The **Viewer** button stays `bg-white`.
4. Wait for `.pdfme-ui-zoom` and for a `.selectable [contenteditable]` on the invoice sample (the default template when no project is saved).
5. Click inside a `contenteditable` field and type. Read the field text back. **Get** dumps inputs with `console.log` and a toast "Dumped as console.log".

`#open-designer` returns to `/designer`. `#generate-pdf` builds a PDF (Alt-click asks for a form PDF instead).

## Gotchas

- Form and Viewer are one route and one React tree. The mode is `useState` plus `localStorage.setItem('mode', ...)`. A reused Chrome profile that already stored `viewer` opens the Viewer, not the Form, until **Form** is clicked.
- Several buttons say **Designer** or **Form/Viewer** on the Templates page. On this page the Designer control is `#open-designer`, and the mode buttons are the ones whose text is exactly `Form` or `Viewer`.
- **Set** calls `window.prompt`. A CDP drive has to answer the dialog before the page continues.
- `#generate-pdf` is also the Designer's output button. Check `location.pathname` is `/form-viewer`.
