# CLI (beta)

`@pdfme/cli` is the command-line interface for JSON-first pdfme workflows.

It is intended for:

- generating PDFs from templates and inputs without writing a custom Node script
- validating templates or unified job files before generation
- diagnosing runtime, font, `basePdf`, and output-path issues before a CI or agent run
- converting existing PDFs into images or page-size metadata
- exporting official example assets as templates or unified job files

## Installation

Node.js 20 or later is required.

```bash
npm install -D @pdfme/cli
```

You can also run it directly with `npx`:

```bash
npx @pdfme/cli generate --help
```

## Commands

- `pdfme generate`
  - generate a PDF from a unified job file or from `--template` + `--inputs`
  - optionally render page images
  - optionally overlay grid lines and schema bounds on generated images
- `pdfme validate`
  - validate a template or unified job before generation
  - return machine-readable inspection data with `--json`
- `pdfme doctor`
  - diagnose environment, input, font, `basePdf`, cache, and output-path issues
- `pdfme pdf2img`
  - convert an existing PDF into page images
- `pdfme pdf2size`
  - inspect PDF page sizes in millimeters

## `pdfme generate`

Generate a PDF from either:

- a unified job file
- a template file plus a separate inputs file

Examples:

```bash
# Unified job file: { template, inputs, options? }
pdfme generate job.json -o out.pdf

# Template + inputs as separate files
pdfme generate -t template.json -i inputs.json -o out.pdf

# Render page images too
pdfme generate job.json -o out.pdf --image

# Overlay grid lines and schema bounds on generated images
pdfme generate job.json -o out.pdf --grid

# Override basePdf from the command line
pdfme generate -t template.json -i inputs.json --basePdf invoice.pdf -o out.pdf

# Structured output for CI or agents
pdfme generate job.json -o out.pdf --image --json
```

Main options:

| Option | Default | Notes |
| --- | --- | --- |
| `[file]` | - | Unified job file containing `{ template, inputs, options? }` |
| `-t, --template` | - | Template JSON file |
| `-i, --inputs` | - | Input JSON file |
| `-o, --output` | `output.pdf` | Output PDF path |
| `--force` | `false` | Allow overwriting the implicit default `output.pdf` |
| `--image` | `false` | Write one image per generated page |
| `--imageFormat` | `png` | `png` or `jpeg` |
| `--scale` | `1` | Render scale for image output |
| `--grid` | `false` | Draw grid lines and schema bounds on generated images |
| `--gridSize` | `10` | Grid spacing in millimeters |
| `--font` | - | Local custom fonts as `Name=path.ttf`, comma-separated for multiple fonts |
| `--basePdf` | - | Override `template.basePdf` with a PDF file path |
| `--noAutoFont` | `false` | Disable automatic `NotoSansJP` resolution for CJK text |
| `-v, --verbose` | `false` | Print input/output/render details to stderr |
| `--json` | `false` | Print JSON only to stdout |

Notes:

- If `output.pdf` already exists and you did not explicitly pass `-o` or `--force`, `generate` refuses to overwrite it.
- `--grid` also triggers image rendering, even if `--image` is not set.
- Generated images are written next to the output PDF as `<output-base>-1.png`, `<output-base>-2.png`, or `.jpg` when `--imageFormat jpeg` is used.
- `--font` resolves local paths relative to the current working directory.
- Local font paths inside unified job `options.font.<name>.data` resolve relative to the job or template file directory.
- When CJK text is detected and no explicit font source is provided, the CLI automatically resolves and caches `NotoSansJP` unless `--noAutoFont` is set.

Unified job example:

```json
{
  "template": {
    "basePdf": {
      "width": 210,
      "height": 297,
      "padding": [20, 20, 20, 20]
    },
    "schemas": [
      [
        {
          "name": "customerName",
          "type": "text",
          "position": { "x": 20, "y": 50 },
          "width": 80,
          "height": 10
        }
      ]
    ]
  },
  "inputs": [
    { "customerName": "John Doe" }
  ],
  "options": {
    "font": {
      "NotoSansJP": {
        "data": "https://fonts.gstatic.com/...",
        "fallback": false,
        "subset": true
      }
    }
  }
}
```

`template.basePdf` can also be a relative PDF path such as `"./invoice.pdf"`. You can override that path at runtime with `--basePdf`.

When `--json` is enabled, stdout is reserved for JSON only:

```json
{
  "ok": true,
  "command": "generate",
  "mode": "job",
  "templatePageCount": 1,
  "inputCount": 1,
  "pageCount": 1,
  "outputPath": "out.pdf",
  "outputBytes": 12345,
  "imagePaths": ["out-1.png"]
}
```

## `pdfme validate`

Validate either a template file or a unified job file before generation.

Examples:

```bash
pdfme validate template.json
pdfme validate job.json --json
cat job.json | pdfme validate - --json
pdfme validate template.json --strict
pdfme validate template.json -v --json
```

What `validate` checks:

- template structure via pdfme validation
- unknown schema types
- duplicate field names on the same page
- repeated field names across pages as warnings
- field positions that extend outside page bounds as warnings
- unknown top-level fields on the template as warnings
- unified job compatibility with `generate`
- field-level input contract issues for unified jobs

Useful flags:

- `--strict`
  - promote warnings to a failing exit code
- `--json`
  - include `valid`, `errors`, `warnings`, `inspection`, and `inputHints`
- `-v, --verbose`
  - print input source, mode, counts, and summary information to stderr

`inputHints` helps automation determine what each writable field expects before calling `generate`. The CLI currently distinguishes:

- plain strings
- asset-like strings with `contentKind`
- barcode strings with a human-readable `rule`
- `string[][]` table payloads
- canonical date/time strings with `format` metadata
- constrained enum strings for `select`, `checkbox`, and `radioGroup`
- JSON string objects for `multiVariableText`

## `pdfme doctor`

Diagnose the environment or a specific template/job before generation.

Examples:

```bash
# Environment diagnosis
pdfme doctor

# Diagnose a template or job
pdfme doctor job.json --json

# Diagnose from stdin
cat job.json | pdfme doctor - --json

# Font-focused diagnosis
pdfme doctor fonts job.json --json

# Simulate generate with automatic CJK font resolution disabled
pdfme doctor job.json --noAutoFont --json

# Preview runtime output and image targets
pdfme doctor job.json -o artifacts/out.pdf --image --imageFormat jpeg --json
```

Modes:

- `pdfme doctor`
  - checks Node version, platform, writable directories, and the `NotoSansJP` cache state
- `pdfme doctor <job-or-template>`
  - adds validation, `basePdf`, font, plugin, and runtime output-path diagnosis
- `pdfme doctor fonts <job-or-template>`
  - focuses on explicit and implicit font sources

Important behavior:

- `doctor` uses `healthy` to report whether blocking issues were found.
- With `--json`, `doctor` still returns `ok: true` when the command itself ran successfully, even if `healthy` is `false`.
- `-o, --output`, `--force`, `--image`, and `--imageFormat` simulate the same output-path behavior used by `generate`.
- `doctor fonts --json` includes `needsNetwork` for each font source so automation can tell whether a job depends on network access.
- `validate`-style `inputHints` are also included in JSON mode.

## `pdfme pdf2img`

Convert an existing PDF into page images.

Examples:

```bash
pdfme pdf2img invoice.pdf
pdfme pdf2img invoice.pdf --grid --gridSize 10
pdfme pdf2img invoice.pdf --pages 1-3
pdfme pdf2img invoice.pdf -o ./images --imageFormat jpeg
pdfme pdf2img invoice.pdf -o ./images --json
```

Behavior:

- `-o, --output` expects a directory, not a filename pattern
- output files are named `<input-base>-<page>.png` or `.jpg`
- `--pages` accepts values such as `1-3` or `1,3,5`
- `--grid` draws a millimeter grid on the rendered page images
- `--json` returns `pageCount`, `selectedPageCount`, `outputPaths`, and per-page width/height metadata

## `pdfme pdf2size`

Inspect PDF page sizes in millimeters.

Examples:

```bash
pdfme pdf2size invoice.pdf
pdfme pdf2size invoice.pdf --json
```

Human-readable output includes standard size labels such as `A4 portrait` when detected. JSON output returns:

```json
{
  "ok": true,
  "command": "pdf2size",
  "pageCount": 1,
  "pages": [
    { "pageNumber": 1, "width": 210, "height": 297 }
  ]
}
```

## Fonts

The CLI treats fonts as an explicit source contract.

Supported explicit font sources:

- local `.ttf` files via `--font Name=./path.ttf`
- local `.ttf` files in unified job `options.font.<name>.data`
- public direct `http(s)` font asset URLs
- `.ttf` data URIs
- inline bytes in programmatic use

Current rules:

- `.ttf` is the only explicitly supported custom font format
- `.otf` and `.ttc` are rejected
- `fonts.googleapis.com/css*` stylesheet URLs are rejected
- unsafe, private, or loopback `http(s)` URLs are rejected
- explicit remote font fetches use a 15-second timeout and a 32 MiB size limit
- remote font failures are returned as `EFONT`

For CJK content, automatic `NotoSansJP` resolution is only used when no explicit font source is provided. If CJK text is detected, the font is not cached, and automatic resolution is disabled or unavailable, `generate` fails with `EFONT`.

## Structured Output and Exit Codes

When you pass `--json`:

- stdout is JSON only
- success payloads use `ok: true`
- failures use `ok: false` and include `error.code`, `error.message`, and sometimes `error.details`
- `-v, --verbose` still writes human-readable diagnostics to stderr

Current exit-code categories:

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | Argument, validation, or unsupported-input failure |
| `2` | Runtime or font-resolution failure |
| `3` | File I/O failure |

## Typical Workflows

Start from a unified job file, diagnose it, then generate images for visual review:

```bash
pdfme doctor job.json --json
pdfme generate job.json -o out.pdf --image --grid
```

For existing-PDF overlay work:

```bash
pdfme pdf2img invoice.pdf --grid --gridSize 10
pdfme pdf2size invoice.pdf --json
pdfme doctor template.json -o out.pdf --image --json
pdfme generate -t template.json -i inputs.json -o out.pdf --image --grid
```
