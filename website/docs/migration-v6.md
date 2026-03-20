# Migration Guide v6

This document tracks the breaking changes planned for the next major release and the minimum migration work needed in applications, examples, and local tooling.

## Breaking Changes

| Change                            | Affected users                                                 | Required action                        |
| --------------------------------- | -------------------------------------------------------------- | -------------------------------------- |
| `ESM-only` packages               | Anyone using `require('@pdfme/...')`                           | Move to `import` / `export` syntax     |
| `Node 20+` minimum runtime        | Node 16 / 18 users                                             | Upgrade to Node 20 LTS or newer        |
| `React 18+` for UI packages       | `@pdfme/ui` consumers on React 16 / 17                         | Upgrade `react` and `react-dom` to 18+ |
| Internal `dist/*` imports removed | Anyone importing `@pdfme/*/dist/...` or `@pdfme/*/cjs/src/...` | Import only from package root exports  |

## Support Policy

| Item             | Policy     |
| ---------------- | ---------- |
| Runtime          | Node 20+   |
| Browser target   | `es2020`   |
| UI peer baseline | React 18+  |
| Module format    | `ESM-only` |

## Migrations

### CommonJS to ESM

Before:

```js
const { BLANK_PDF } = require('@pdfme/common');
const { generate } = require('@pdfme/generator');
```

After:

```ts
import { BLANK_PDF } from '@pdfme/common';
import { generate } from '@pdfme/generator';
```

If you write files in Node.js from ESM, replace `__dirname` usage with `fileURLToPath(import.meta.url)`.

```ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

### Internal Package Paths

Before:

```ts
import { generate } from '@pdfme/generator/cjs/src/index.js';
import { pdf2img } from '@pdfme/converter/cjs/src/index.node.js';
```

After:

```ts
import { generate } from '@pdfme/generator';
import { pdf2img } from '@pdfme/converter';
```

### React 18+

Update UI consumers to React 18 or newer:

```bash
npm install react@^18 react-dom@^18
```

### Node 20+

Update local development and CI to Node 20 LTS or newer before adopting the next major release.

## Maintainer Checklist

- Announce the policy before release in GitHub Discussions or Issues.
- Update examples, docs, and the playground to use public package exports only.
- Remove remaining `require()` examples from Node-focused samples.
- Verify no documentation recommends internal `dist/*` imports.
