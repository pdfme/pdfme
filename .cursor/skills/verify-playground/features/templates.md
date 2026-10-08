# Templates

## Sub-features

- Sample gallery under the heading **Templates**, with the line "Choose a Designer sample, JSX starter, or md2pdf starter from the same gallery."
- Type filters whose button text is `All`, `Designer`, `JSX`, and `md2pdf`. Tag filters include `All` and the tag names from the gallery (`Invoice`, `Form`, `QR`, and the rest of `tagSortOrder` in `Templates.tsx`).
- A card per sample. The thumbnail id is `template-img-<name>` (invoice is `#template-img-invoice`). Designer samples have **Designer** and **Form/Viewer** buttons. JSX and md2pdf starters have **Open Starter**.
- **My Workspace** at `/workspace`: heading **My Workspace**, **Browser Projects**, **Import Template JSON**, **New Local Template**, and **Mounted Folder**.

## How to get to it (user POV)

The playground opens on `/`, which renders the same Templates page as `/templates`. The **Templates** tab (`#templates-nav`) goes to `/templates`. The wordmark **pdfme playground** goes to `/`. **My Workspace** (`#workspace-nav`) goes to `/workspace`.

Click a sample thumbnail to open it. A Designer sample opens `/designer?template=<name>`. **Form/Viewer** on that card opens `/form-viewer?template=<name>`. **Open Starter** opens `/jsx` or `/md2pdf` with the starter selected.

## Driving it with CDP

1. Go to `http://127.0.0.1:5193/templates`.
2. Wait for `#templates-nav` and for an `h2` whose text is `Templates`.
3. Click the type-filter button whose text is `Designer` (the gallery filters, not the header tab `#designer-nav`). Cards that remain are Designer samples.
4. Click `#template-img-invoice`. The address becomes `/designer?template=invoice`, and `.pdfme-designer-canvas` appears.
5. For workspace, click `#workspace-nav` and wait for the heading **My Workspace**. An empty profile shows "No browser projects yet. Create a local template, import JSON, or save from Designer, JSX, or md2pdf."

## Gotchas

- `/` and `/templates` both render `Templates`. `#templates-nav` is also marked active on `/` (`to === '/templates' && pathname === '/'`).
- Button text `Designer` and `All` is repeated: once in the header, once per filter, and once per card. Prefer `#designer-nav` for the tab, and `#template-img-invoice` for a specific sample. Card buttons are not uniquely id'd.
- **New Local Template** opens a menu. **Blank** navigates to `/designer?new=1`. Choosing a PDF uses a hidden `<input type="file" accept="application/pdf">`.
- **Mounted Folder** calls the File System Access API. A headless profile will not have a real directory handle unless the drive grants one.
