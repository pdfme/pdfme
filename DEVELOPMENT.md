# Contribute to the Codebase

- Clone the repository
- install dependency with `npm install`
- build the packages with `npm run build`
- if you need package-local `npm link` wiring for a specific workflow, run `npm run link-workspaces`

```cmd
[in pdfme dir] $ npm install
[in pdfme dir] $ npm run link-workspaces # optional
[in pdfme dir] $ npm run build
```

At this point, to check if the build is done correctly, let's execute `npm run test` once. This will call the test suites for each package.

```cmd
[in pdfme dir] $ npm run test
```

`packages/pdf-lib/src` uses explicit `.js` extensions for relative imports and exports, including `/index.js` for directory barrels. Its declaration build uses NodeNext resolution so invalid ESM references fail during the build; emitted declarations need no rewriting.

To verify published `@pdfme/pdf-lib` declarations against a standalone Node ESM consumer (`moduleResolution: NodeNext`, `skipLibCheck: false`), run `npm run test:types:consumer` after a full build. The command compiles its TypeScript runner to JavaScript (also runnable on Node 20), packs the built package, and type-checks it outside the workspace. It checks NodeNext, Node16, and Bundler with TypeScript 6.0.2 and the repo-locked compiler; legacy node10 resolution is checked only with 6.0.2 because TypeScript 7 removed it.

```cmd
[in pdfme dir] $ npm run build
[in pdfme dir] $ npm run test:types:consumer
```

Then, run `npm run dev` on `packages/common`, `packages/schemas`, `packages/generator`, and `packages/ui`,
and make sure that any changes are output to each packages `dist` folder.

```cmd
[in pdfme/packages/common dir] $ npm run dev
[in pdfme/packages/schemas dir] $ npm run dev
[in pdfme/packages/ui dir] $ npm run dev
[in pdfme/packages/generator dir] $ npm run dev
```

If you want to check the changes in the browser, go to `playground`.

```cmd
[in pdfme/playground dir] $ npm install
[in pdfme/playground dir] $ npm run dev
```

If `npm run dev` is running in each package, changes made will be reflected in the playground. (For the UI package, it may take about 5-10 seconds for the changes to be reflected.)

Please feel free to send a PR if you can fix bugs or add new features. Also, don't forget to add the necessary tests before sending a PR and make sure that the tests pass.

Happy hacking!
