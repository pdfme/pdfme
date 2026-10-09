---
name: verify-playground
description: Verify the pdfme playground web UI (Designer, Form, and Viewer) the way a user would. Use when a change should be proved in the browser against the running playground, not by calling the @pdfme library packages directly.
---

# Verify the pdfme playground

The primary surface is the playground web UI. Designer, Form, and Viewer are pages in `playground/`. The `@pdfme/*` packages are the library behind that UI. Build them so the playground can import `dist`, then drive the playground. Do not treat package unit tests as this check.

There is no Playwright or Cypress project. `playground/e2e/index.test.ts` is Vitest plus Puppeteer, and it starts `npm run preview` (the static preview, default base `http://127.0.0.1:4173`), not the documented dev server. This skill drives the dev server with Chrome DevTools Protocol.

Two playgrounds cannot share a port. `vp dev` forwards `--port` to Vite (`vp dev --help` shows `vp dev --host localhost --port 5173`). The documented command leaves the port unset, so Vite uses 5173. A second server fails when that port is taken (`--strictPort`) or silently moves (`strictPort` defaults off). Verification always uses **5193** with `--strictPort`, and its own Chrome debugging port **9333**.

`playground/e2e/index.test.ts` starts `npm run preview -- --host 127.0.0.1` and reads the URL Vite prints. It does not pass `--port` or `--strictPort`. Vite preview's default is 4173, which is the fallback `baseUrl` in that file. Port 5193 is neither the dev default nor the preview default, so this skill does not take the port the e2e harness expects.

## Launch

Prerequisites, from the repo root. `packageManager` is `npm@11.12.1`. `npm` 10.9.7 fails `npm ci` with `Cannot read properties of null (reading 'edgesOut')`. `playground` is not an npm workspace and has its own lockfile.

```bash
npm ci
npm ci --prefix playground
npm run build
```

`vite-plus@1.0.0` (the `vp` binary) declares engines `^22.18.0 || ^24.11.0 || >=26.0.0`. The launch script refuses other Node versions. No playground env vars are required. `playground/.env.example` only documents optional `SENTRY_AUTH_TOKEN` and `VITE_SENTRY_DSN`.

Documented dev command, from `CLAUDE.md`. This binds port 5173 and is the command a person uses while developing:

```bash
cd playground && npm run dev
```

That script is `npm run generate-template-assets && vp dev`. npm appends arguments after `--` to the end, so they reach `vp dev`. The verification command is the same script on the dedicated port:

```bash
cd playground && npm run dev -- --host 127.0.0.1 --port 5193 --strictPort
```

Prefer the helper, which records the npm pid and waits until the server is actually up:

```bash
.cursor/skills/verify-playground/scripts/launch.sh
```

Ready means all of these, which the helper waits up to 180 seconds for:

- The npm pid from `tmp/verify-playground/server.pid` is still alive. `npm run dev` first runs template-asset generation, so the port stays closed until that finishes and Vite+ starts.
- `curl` of `http://127.0.0.1:5193/` returns the playground shell, including `<title>pdfme Playground</title>` from `playground/index.html`.
- The log contains the Vite+ ready line. A successful start prints:

```text
  VITE+ v1.0.0

  ➜  Local:   http://127.0.0.1:5193/
```

Asset generation can rewrite files under `playground/public/template-assets/` (a probe run changed `playground/public/template-assets/jsx-invoice/template.json`). Do not commit those generated files with this skill.

Teardown is `scripts/cleanup.sh`. It does not run as part of launch.

## Doctor

Read-only check that the process this run started is still the process listening:

```bash
.cursor/skills/verify-playground/scripts/doctor.sh
```

It exits 0 only when `tmp/verify-playground/server.pid` names a live process whose `ps -o lstart=` matches the start time stored in that file, and a listener on TCP 5193 is that pid or a descendant (`lsof`, or `ss` when `lsof` is absent, then `ps -o ppid=`). It does not start, signal, or delete anything. Success looks like:

```text
ok pid=<npm-pid> port=5193 listeners=<node-pid> base=http://127.0.0.1:5193
```

## Drive

Open the app in Chrome and use the selectors below. The shipped drive hits Designer only. Routes and controls for the other mapped features are in `features/`.

Header tabs in `playground/src/components/Header.tsx`:

| Route | Tab id | Label |
| --- | --- | --- |
| `/templates` (also `/`) | `#templates-nav` | Templates |
| `/workspace` | `#workspace-nav` | My Workspace |
| `/designer` | `#designer-nav` | Designer |
| `/form-viewer` | `#form-viewer-nav` | Form/Viewer |
| `/jsx` | `#jsx-nav` | JSX |
| `/md2pdf` | `#md2pdf-nav` | md2pdf |

Designer (`/designer`), English UI (`lang: 'en'` in `playground/src/routes/Designer.tsx`):

- `#open-form-viewer` opens Form/Viewer. Unsaved workspace edits open the dialog `#preview-navigation-title` ("Save before opening Form/Viewer?") with `#open-form-viewer-without-saving` and `#save-and-open-form-viewer`.
- `#save-local`, `#save-as`, `#reset-template`, `#generate-pdf`.
- Toolbar: `button.pdfme-ui-zoom-out` (`aria-label="Zoom out"`), `button.pdfme-ui-zoom-in` (`aria-label="Zoom in"`), `button.pdfme-ui-fit-width`, `button.pdfme-ui-fit-height`. The percent label is the text inside `.pdfme-ui-zoom`. Page controls are `.pdfme-ui-page-prev`, `.pdfme-ui-page-next`, and `.pdfme-ui-pager` (`1/N`).
- Canvas: `.pdfme-designer-canvas`. Field palette: `.pdfme-designer-plugin-<type>`, for example `.pdfme-designer-plugin-text` (the Text plugin's `defaultSchema.type` is `text`). These buttons are drag sources, not click-to-insert.
- A fresh profile with no playground project loads `/template-assets/invoice/template.json` (`DEFAULT_PLAYGROUND_TEMPLATE_ID` is `invoice`).

The helper drives that page:

```bash
.cursor/skills/verify-playground/scripts/drive.sh
```

It refuses to start unless doctor would pass, launches headless Chrome (`google-chrome` or Chromium) with `--remote-debugging-port=9333` and a user-data-dir under `tmp/verify-playground/chrome-profile`, then `scripts/cdp-drive.mjs` opens `http://127.0.0.1:5193/designer`. It waits until the address is `/designer` and all of these are present: `#designer-nav`, `#open-form-viewer`, `.pdfme-designer-canvas`, `.pdfme-designer-plugin-text`, `button.pdfme-ui-zoom-out`, and a percent inside `.pdfme-ui-zoom`. The same check fails the run when the wait ends. It clicks Zoom out. Initial zoom in `@pdfme/ui` Designer is `1`, and the zoom step is `0.25`, so the label moves from `100%` to `75%`.

## Evidence

`scripts/drive.sh` writes only under `tmp/verify-playground/evidence/`:

- `designer-before.png` — Designer before the click
- `designer-after.png` — Designer after Zoom out
- `designer-drive.json` — url, `zoomBefore`, `zoomAfter`, whether `#designer-nav` has `border-green-500`, the invoice template response status, console messages, and network responses for this origin

`tmp/verify-playground/` is gitignored. Cleanup must not delete `evidence/`. Server and Chrome logs (`server.log`, `chrome.log`) sit next to the evidence directory and are also left in place.

## Cleanup

```bash
.cursor/skills/verify-playground/scripts/cleanup.sh
```

Each pid file stores `pid=` and `lstart=` (`LC_ALL=C ps -o lstart=`). Cleanup signals a process only when that pid is still alive and its start time still matches. A reused pid is left alone. It snapshots the process and its descendants with `pgrep -P` (or `ps -ax -o pid=,ppid=` when `pgrep` is missing) before sending `TERM`, then `KILL`s any of those same pids that are still alive. It never uses `pkill`, `killall`, a process name, or `/proc`. The scripts stay within bash 3.2 (`ps`, `pgrep`, `lsof`); they do not use `readlink -f`, GNU `timeout`, or `ps --ppid`. It removes the two pid files and leaves `tmp/verify-playground/evidence/` on disk. If a drive fails, run cleanup before launching again so 5193 and 9333 are free.

## Helpers

All of these are executable and run from the repo root:

```bash
.cursor/skills/verify-playground/scripts/launch.sh
.cursor/skills/verify-playground/scripts/doctor.sh
.cursor/skills/verify-playground/scripts/drive.sh
.cursor/skills/verify-playground/scripts/cleanup.sh
```

`drive.sh` calls `scripts/cdp-drive.mjs` with `node`. `scripts/lib.sh` only holds shared paths and is sourced by the shell helpers.
