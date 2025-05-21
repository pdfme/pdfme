# Migration Guide: v3 → v4

## Overview

pdfme v4 introduces breaking changes:
- **ESM-only distribution**: CommonJS is no longer supported.
- **Node.js v20 or later is required**
- All relative imports must include the `.js` extension

This guide helps you migrate your project from pdfme v3 (or earlier) to v4.

---

## Major Changes

### 1. ESM-only
- All packages are now published as ESM only. You must use `import`/`export` syntax.
- Your project must have `"type": "module"` in `package.json`, or use `.mjs` file extensions.
- `require()` and CommonJS are not supported.

### 2. Node.js v20+
- pdfme v4 requires Node.js v20 or later. Please upgrade your Node.js runtime.

### 3. Import Extensions
- All relative imports must include the `.js` extension. For example:
  ```js
  import { foo } from './foo.js';
  ```

---

## Migration Steps

1. **Upgrade Node.js**
   - Ensure your environment uses Node.js v20 or later.

2. **Update your `package.json`**
   - Add or update:
     ```json
     {
       "type": "module"
     }
     ```

3. **Update Imports**
   - Change all `require()` to `import`.
   - Add `.js` to all relative import paths.

4. **Update Dependencies**
   - Upgrade all `@pdfme/*` packages to v4 or later.

5. **Update Build & Test Scripts**
   - Ensure your build/test tools support ESM (e.g., Jest with ESM config).

---

## Example: Before & After

**Before (CJS):**
```js
const { generate } = require('@pdfme/generator');
```

**After (ESM):**
```js
import { generate } from '@pdfme/generator';
```

---

## Common Issues & Solutions

- **SyntaxError: Cannot use import statement outside a module**
  - Add `"type": "module"` to your `package.json` or use `.mjs` files.

- **Error: Cannot find module './foo'**
  - Add `.js` extension to all relative imports: `import { foo } from './foo.js';`

- **Jest or other tools fail**
  - Ensure your test runner supports ESM. See [Jest ESM docs](https://jestjs.io/docs/ecmascript-modules).

---

## FAQ

**Q: Can I still use pdfme with CommonJS?**
A: No. v4 and later are ESM-only. Use v3 if you need CJS support.

**Q: Do I need to change my templates or input data?**
A: No, template and input formats are unchanged.

**Q: Where can I get help?**
A: Open an issue on GitHub or join our [Discord](https://discord.gg/xWPTJbmgNV).

---

For more details, see the [README](./README.md) and [official documentation](https://pdfme.com/docs/). 