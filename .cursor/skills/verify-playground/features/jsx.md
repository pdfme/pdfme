# JSX

## Sub-features

- Heading `@pdfme/jsx (beta)` and a **Docs** link.
- Monaco editor labeled JSX (`[aria-label="JSX"]`). The first starter loads into the editor without a preset dropdown.
- Preview pane headed **Viewer**, backed by `@pdfme/ui` Viewer.
- Buttons **Template JSON**, **Save Project**, **Save As**, **Open Designer**, and **Generate PDF**. They stay disabled until a template has rendered and there is no error.

## How to get to it (user POV)

Click the **JSX** tab (`#jsx-nav`). The address is `/jsx`. The page loads the first JSX starter from the authoring-starter list. From Templates, filter type **JSX** and click **Open Starter** on a card. That opens `/jsx` with that starter.

## Driving it with CDP

1. Go to `http://127.0.0.1:5193/jsx`.
2. Wait for `#jsx-nav`, an `h1` whose text is `@pdfme/jsx (beta)`, and `[aria-label="JSX"]`.
3. Wait until the **Open Designer** button is enabled (it is disabled while `template` is missing or `error` is set). The preview column shows the label `Viewer`.
4. Click **Open Designer**. The page saves a browser project and navigates to `/designer?project=<id>`. A toast starts with `Saved`.

Do not click **Generate PDF** until the button is enabled. While a PDF is generating, its label is `Generating...`.

## Gotchas

- The editor is Monaco inside `[aria-label="JSX"]`. Typing into it is an editor command, not a plain `<textarea>` value.
- **Open Designer** writes a project to IndexedDB (`pdfme-playground-projects`) before navigating. A later `/designer` visit in the same profile can reopen that project instead of the invoice sample.
- The amber banner says the playground runs JSX in a worker and is for trusted examples. The worker is `jsxPlaygroundWorker`. A failed render shows the error text in the Viewer header, in red.
- Save buttons use `window` only indirectly. **Save As** still creates another browser project. They are not safe to click if the drive must leave IndexedDB empty.
