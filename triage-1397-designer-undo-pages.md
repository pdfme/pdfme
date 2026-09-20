# Issue #1397 - The undo function is incorrect when adding pages

- **Status on current main:** `reproduces`
- **Suggested maintainer action:** keep

## Rationale

The current undo/redo implementation in `packages/ui/src/hooks.ts` stores single-page schema arrays in `past`/`future` and restores the popped array into the current `pageCursor`:

```ts
(isUndo ? future : past).current.push(cloneDeep(schemasList[pageCursor]));
const s = cloneDeep(schemasList);
s[pageCursor] = stack.current.pop()!;
setSchemasList(s);
```

Runtime simulation of that logic reproduces the page-crossing corruption: page 1 starts with `field1`, page 2 has `field2, field3`, and undo on page 1 changes page 1 to `field2`.

I also recorded a real browser Designer run on a seeded two-page blank template. In the browser video, page 1's Field List shows `field1` before Ctrl+Z and `field2` after Ctrl+Z. The exact automated "Add Page After" menu click was brittle in headless Chrome, so the browser run starts from a seeded two-page template; the current source/runtime history behavior explains why the issue also occurs after adding pages.

## Evidence

- Browser video: `artifacts/batch-a/evidence-1397-designer-undo-browser.mp4`
- Runtime simulation video: `artifacts/batch-a/evidence-1397-designer-undo-simulated.mp4`
- Browser before undo screenshot: `artifacts/batch-a/issue-1397-browser-frames/004-back-page1-before-undo.png`
- Browser after undo screenshot: `artifacts/batch-a/issue-1397-browser-frames/005-page1-after-undo.png`
- Browser summary: `artifacts/batch-a/issue-1397-browser-summary.json`
- Runtime log: `artifacts/batch-a/repro-output.txt`

Key runtime output:

```text
before undo page1=field1 page2=field2,field3
after current timeTravel('undo') logic page1=field2 page2=field2,field3
```
