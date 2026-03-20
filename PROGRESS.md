# PROGRESS

Last updated: 2026-03-20 JST

Latest committed checkpoint:

- `2dec270b` `Migrate common and manipulator builds to Vite`

## Current Status

`PLAN.md` のうち、まず安全に着手できる `Phase 0` と playground 周辺のブロッカー解消を実装済み。

今回までで完了:

- `Phase 0` の互換性方針と migration guide の整備
- playground の public export 化と Node playground の ESM 化
- `Phase 1` の前提となる TypeScript typecheck 基盤
  - ルート `tsconfig.json`
  - package references
  - internal package path の source 解決
  - build tsconfig の `src` 限定化
- `Phase 1` の一部である root の Vitest / Oxlint 基盤
- 全 package (`common` / `manipulator` / `converter` / `schemas` / `generator` / `pdf-lib` / `ui`) の Jest -> Vitest 移行
- clean `npm run typecheck` で露出していた latent type error の解消
- `packages/converter` の `pdfjs-dist` / `canvas` 最新系への更新
- `pdfjs-dist` v5 系で再発していた Node 側 `pdf2img` 実行不整合の解消
- `generator` image snapshot の再基準化
- `pdfjs-dist` v5 系に合わせた browser worker entry の修正
- `pdfjs-dist` / `canvas` 更新後の root build 再通過
- type-aware lint / oxlint の `pdf-lib` / `ui` への適用拡大
- `@pdfme/pdf-lib` の Node ESM named import 修正
- `fe08c521` で誤って更新した blank snapshot の撤回と、renderer 修正後の再基準化
- `common` / `manipulator` の build を Vite library mode + declaration emit に移行
- `common` / `manipulator` の package exports を `dist/index.js` / `dist/index.d.ts` 前提へ整理
- `manipulator` e2e image snapshot を pixelmatch v6 の AA 差分に合わせて再基準化
- `pdf-lib` clean 時に stray `src/**/*.d.ts` を確実に掃除するよう修正
- `converter` / `schemas` / `generator` の build を Vite library mode + declaration emit に移行
- `converter` / `schemas` / `generator` の package exports を `dist/*` 直下の ESM 出力へ整理
- `schemas` の `air-datepicker/locale/*` を Node ESM でも壊れない形で bundle 側へ吸収

まだ未着手:

- CLI (`Phase 2`)
- Claude Code Skills (`Phase 3`)

現在の残課題:

- package build の Vite 化と exports 再設計
  - 残り: `pdf-lib` / `ui`
- lint warning の整理
- playground 側の exports 変更追従確認

次に進める順序:

1. `pdf-lib` / `ui` の build 置換方針を整理し、package build の Vite 化を完了させる
2. lint warning を段階的に整理する
3. playground 側の exports 追従確認を行う

## Completed Work

### 1. Phase 0: 互換性方針のドキュメント化

追加・更新済み:

- `website/docs/migration-v6.md`
- `website/i18n/ja/docusaurus-plugin-content-docs/current/migration-v6.md`
- `README.md`
- `website/docs/development-guide.md`
- `website/i18n/ja/docusaurus-plugin-content-docs/current/development-guide.md`
- `website/sidebars.js`

内容:

- 次期メジャーでの breaking changes を整理
- `ESM-only`
- `Node 20+`
- UI package の `React 18+`
- 内部 `dist/*` import 廃止
- `require()` から `import` への移行例を記載

### 2. `set-version.js` の ESM 化ブロッカー解消

実施内容:

- `packages/common/set-version.js` を `packages/common/set-version.cjs` にリネーム
- `packages/common/package.json` の `dev` / `prebuild` を `node set-version.cjs` に変更
- Node built-in import を `node:` prefix に統一

理由:

- 将来 package を `type: "module"` 化しても `set-version` が壊れないようにするため

### 3. playground の package root 参照化

実施内容:

- `playground/package.json` の `file:../packages/*/dist` を `file:../packages/*` に変更
- `playground/package-lock.json` も同内容に更新
- `playground/node_modules/@pdfme/*` が package root を向くことを確認済み

理由:

- `dist` 直接参照をやめて public export ベースに寄せるため

### 4. playground scripts の内部 import 廃止

実施内容:

- `playground/scripts/generate-templates-thumbnail.mjs` の以下を置換
- `@pdfme/generator/cjs/src/index.js` -> `@pdfme/generator`
- `@pdfme/converter/cjs/src/index.node.js` -> `@pdfme/converter`
- `@pdfme/common/cjs/src/index.js` -> `@pdfme/common`
- `@pdfme/schemas/cjs/src/index.js` -> `@pdfme/schemas`

補足:

- `node:` prefix の import に整理済み

### 5. Node playground の ESM 化

実施内容:

- `playground/node-playground/package.json` を追加して `type: "module"` を設定
- `playground/node-playground/generate.js` を ESM に書き換え
- `playground/node-playground/merge.js` を ESM に書き換え
- `__dirname` は `fileURLToPath(import.meta.url)` ベースへ置換

### 6. `@pdfme/manipulator` の Node import 条件修正

実施内容:

- `packages/manipulator/package.json` の `exports` に `import.node` 条件を追加
- Node ESM import 時は `./dist/cjs/src/index.js` を使うように変更

理由:

- `playground/node-playground/merge.js` を public export 経由で動かすと、
  既存の export 条件では browser/esm 側へ寄って `@pdfme/pdf-lib` の named export 解決に失敗していたため

### 7. Phase 1: TypeScript typecheck 基盤

実施内容:

- ルート `tsconfig.json` を追加して solution style references を定義
- ルート `package.json` に `typecheck` script を追加
- `tsconfig.base.json` に internal package 用の `baseUrl` / `paths` を追加
- `tsconfig.base.json` から `jest` 型を削除
- 各 package の `tsconfig.json` を typecheck 用 `composite` project に変更
- `common` / `converter` / `schemas` / `generator` / `manipulator` / `pdf-lib` は
  `dist/typecheck` へ declaration-only 出力する構成に変更
- `ui` は build 用 `tsconfig.json` と typecheck 用 `tsconfig.typecheck.json` を分離
- 各 build 用 `tsconfig.*.json` を `src` 限定に変更し、`__tests__` が build 出力へ混ざらないよう修正
- `packages/ui/vite.config.mts` に internal package alias を追加して clean build 後でも source 解決できるように修正
- `.gitignore` に `*.tsbuildinfo` を追加

理由:

- clean checkout で package 間型解決が壊れない状態を先に作るため
- 既存 build が `__tests__` を `dist` に吐いていたため、その副作用を止めるため
- `ui` は build 設定と typecheck 設定の責務を分けないと declaration build と references が衝突するため

### 8. Phase 1: root の Vitest / Oxlint 基盤

実施内容:

- ルート `package.json` に以下を追加
- `vitest`
- `vitest-image-snapshot`
- `vite`
- `oxlint`
- ルート `vitest.config.ts` を追加
- ルート `eslint.typecheck.config.mjs` を追加
- ルート scripts を追加
- `test:common`
- `test:manipulator`
- `test:manipulator:update-snapshots`
- `lint:typecheck`
- `lint:oxlint`
- `.gitignore` に以下を追加
- `**/__image_actual__/**`
- `**/__image_diffs__/**`
- `**/__image_diff_report__/**`

補足:

- `lint:typecheck` と `lint:oxlint` は現時点では `common` / `converter` / `generator` / `manipulator` / `schemas` にスコープ
- `pdf-lib` / `ui` への拡張は残課題として別管理
- `vitest.config.ts` は workspace の `cwd` を見て package ごとの設定を切り替える構成

### 9. `common` / `manipulator` の Jest -> Vitest 移行

実施内容:

- `packages/common/package.json` の `test` を Vitest 実行へ変更
- `packages/manipulator/package.json` の `test` / `test:update-snapshots` を Vitest 実行へ変更
- `common` / `manipulator` の `package.json` から inline Jest config を削除
- `packages/manipulator/jest.setup.js` を削除
- `packages/manipulator/vitest.setup.ts` を追加して `vitest-image-snapshot` を登録
- `manipulator` の e2e snapshot test を `toMatchImage` ベースへ置換
- `common` / `manipulator` の test code で `__dirname` を `import.meta.url` ベースへ置換
- ルート `eslint.config.mjs` に `vi` global を追加

理由:

- `common` は Jest 固有 API 依存が少なく、最初の移行対象として安全だったため
- `manipulator` は image snapshot があるが、`vitest-image-snapshot` で移行可能だったため
- `__dirname` は Vitest の ESM 実行では使えないため、先に除去が必要だったため

### 10. `converter` / `schemas` の Jest -> Vitest 移行

実施内容:

- `packages/converter/package.json` の `test` を Vitest 実行へ変更
- `packages/schemas/package.json` の `test` を Vitest 実行へ変更
- `converter` / `schemas` の `package.json` から inline Jest config を削除
- ルート `vitest.config.ts` に `converter` / `schemas` を追加
- ルート `package.json` に `test:converter` / `test:schemas` を追加
- ルート `lint:typecheck` / `lint:oxlint` の対象を `converter` / `schemas` まで拡張
- `packages/schemas/__tests__/text.test.ts` の `__dirname` を `import.meta.url` ベースへ置換
- `packages/schemas/__tests__/text.test.ts` の Jest spy をやめ、幅 1 の mocked font に置換

理由:

- `converter` は Jest 固有 API 依存がなく、設定差し替え中心で移行可能だったため
- `schemas` は `text.test.ts` に ESM 非互換な `jest.spyOn(require(...))` があり、そこだけテストロジックを Vitest 向けに組み替える必要があったため
- `lint:typecheck` / `lint:oxlint` を migration 済み package に合わせて広げることで、段階的に root 基盤を有効化できるため

### 11. `generator` の Jest -> Vitest 移行

実施内容:

- `packages/generator/package.json` の `test` / `test:update-snapshots` を Vitest 実行へ変更
- `packages/generator/package.json` から inline Jest config を削除
- `packages/generator/jest.setup.js` を削除
- `packages/generator/vitest.setup.ts` を追加して `vitest-image-snapshot` を登録
- ルート `vitest.config.ts` に `generator` を追加
- ルート `package.json` に `test:generator` を追加
- `packages/generator/__tests__/utils.ts` と `integration-playground.test.ts` の `__dirname` を `import.meta.url` ベースへ置換
- `packages/generator/__tests__/assets/templates/index.ts` に `createRequire(import.meta.url)` を追加
- generator の image snapshot test を `toMatchImage` ベースへ置換
- `PinyonScript-Regular.ttf` を `packages/generator/__tests__/assets/fonts/` に追加し、test font を remote fetch ではなく local asset に変更
- `lint:typecheck` / `lint:oxlint` の対象を `generator` まで拡張
- `packages/generator/src/generate.ts` / `packages/generator/src/helper.ts` の不要な型 assertion を削除

理由:

- generator は image snapshot と test asset の `require()` があるため、Vitest 用 setup と ESM 対応が必要だったため
- playground snapshot test が remote font fetch に依存しており、この環境では安定実行できないため local asset 化が必要だったため
- lint 対象拡張で出た型 assertion 2 件は既存挙動を変えずに解消できたため

### 12. `pdf-lib` の Jest -> Vitest 移行

実施内容:

- `packages/pdf-lib/package.json` の `test` を Vitest 実行へ変更
- `packages/pdf-lib/package.json` から inline Jest config を削除
- ルート `vitest.config.ts` に `pdf-lib` を追加
- ルート `package.json` に `test:pdf-lib` を追加
- `packages/pdf-lib/__tests__` の `jest.fn` / `jest.clearAllMocks` を `vi.fn` / `vi.clearAllMocks` へ置換

理由:

- `pdf-lib` は runner 依存が薄く、少数の mock API 置換だけで移行できたため
- `ui` より先に進めるほうが安全だったため

### 13. `ui` の Jest -> Vitest 移行

実施内容:

- `packages/ui/package.json` の `test` を Vitest 実行へ変更
- `packages/ui/package.json` から inline Jest config を削除
- ルート `vitest.config.ts` に `ui` workspace と `jsdom` environment を追加
- `packages/ui/vitest.setup.ts` を追加して `jest-dom` / `jest-canvas-mock` / cleanup を集約
- `packages/ui/__mocks__/converter.ts` / `form-render.ts` / `lucide-react.ts` を追加
- `Designer.test.tsx` / `Preview.test.tsx` の snapshot を Vitest 向けに安定化
- `PluginIcon.test.tsx` / `helper.test.ts` / `assets/helper.ts` の Jest API を `vi` ベースへ置換
- `packages/ui/__tests__/test-helpers.js` を削除
- ルート `package.json` に `test:ui` / `test:ui:update-snapshots` を追加

理由:

- `ui` は jsdom と mock 解決が必要で、最後の移行対象として個別調整が多かったため
- snapshot の DOM id が非決定的だったため、Vitest でも安定する正規化が必要だったため

### 14. build 用 tsconfig の分離

実施内容:

- `tsconfig.build.base.json` を追加
- 各 package の build 用 `tsconfig.cjs.json` / `tsconfig.esm.json` / `tsconfig.node.json` を
  `tsconfig.build.base.json` 継承へ切り替え
- 各 build 用 tsconfig に `rootDir: "."` を追加し、出力を `dist/*/src/*` に揃えるよう修正

確認済み:

- `npm run build`
- `cd playground/node-playground && node generate.js`
- `cd playground/node-playground && node merge.js`

補足:

- これにより `@pdfme/common` などの Node import は再び package export 経由で解決できる状態に戻った
- `npm run build`、`playground/node-playground/generate.js`、`playground/node-playground/merge.js` は通過済み
- 後続対応として clean `npm run typecheck` で露出していた latent type error も解消済み

### 15. clean `npm run typecheck` の latent type error 解消

実施内容:

- `packages/schemas/src/text/types.ts` の `TextSchema` を `Schema & { ... }` へ変更
- `packages/schemas/src/barcodes/types.ts` の `BarcodeSchema` を `Schema & { ... }` へ変更
- `packages/schemas/src/tables/types.ts` の `TableSchema` を `Schema & { ... }` へ変更
- `packages/schemas/src/multiVariableText/types.ts` の `MultiVariableTextSchema` を intersection type に変更

理由:

- clean build 後は declaration 解決がより厳密になり、`interface extends` では base `Schema` の union 的な shape と衝突していたため
- typecheck 基盤導入後に顕在化した既存の型不整合を、挙動変更なしで解消する必要があったため

### 16. `packages/converter` の `pdfjs-dist` / `canvas` 更新

実施内容:

- `packages/converter/package.json` の `pdfjs-dist` を `^5.5.207` に更新
- `packages/converter/package.json` の `canvas` を `^3.2.1` に更新
- `packages/converter/src/index.node.ts` を `pdfjs-dist/legacy/build/pdf.mjs` ベースへ更新
- `pdfjs-dist` に渡す PDF data を copy して buffer detach の影響を避けるよう変更
- `packages/converter/src/pdf2img.ts` の render parameters に `canvas` を明示的に渡すよう変更

理由:

- `pdfjs-dist` v5 系では Node 側の canvas 解決と `CanvasFactory` の扱いが v3 系から変わっており、既存実装では `Image or Canvas expected` が再現したため
- `canvas` を最新版 3.x 系へ揃え、`pdfjs-dist` 側の想定と一致する構成へ寄せる必要があったため

### 17. browser worker entry 修正

実施内容:

- `packages/converter/src/index.browser.ts` を `pdfjs-dist/webpack.mjs` ベースへ切り替え
- `packages/converter/src/pdfjs-dist-webpack.d.ts` を追加して module declaration を補完

理由:

- `pdfjs-dist` v5 では `pdf.worker.entry.js` が存在せず、`ui` build が browser worker import 解決エラーで落ちていたため

### 18. `pdf-lib` / `ui` への type-aware lint / oxlint 拡張

実施内容:

- root `package.json` の `lint:typecheck` / `lint:oxlint` に `packages/pdf-lib/src` と `packages/ui/src` を追加
- `eslint.typecheck.config.mjs` を `PLAN.md` 準拠の型認識ルール専用構成へ整理
- `@typescript-eslint/await-thenable` に反していた `pdf-lib` の不要な `await` を削除
- `packages/ui/src/components/Designer/RightSidebar/ListView/Item.tsx` の古い `react/prop-types` disable を削除

理由:

- `PLAN.md` の方針では type-aware lint は `no-floating-promises` / `no-misused-promises` / `await-thenable` のみを ESLint で担う想定で、`recommended-requiring-type-checking` 全量を当てる想定ではなかったため
- その方針に戻すことで、既存 package の大規模な unrelated lint error を出さずに `pdf-lib` / `ui` まで適用対象を広げられるため

### 19. `@pdfme/pdf-lib` の Node ESM named import 修正

実施内容:

- `packages/pdf-lib/package.json` の `exports.import.node` を `./dist/node/index.mjs` へ変更
- `packages/pdf-lib/write-node-esm-wrapper.cjs` を追加し、build 後に CJS export を再公開する ESM wrapper を自動生成
- `node --input-type=module -e "import { PDFDocument } from '@pdfme/pdf-lib'"` が通ることを確認

理由:

- 既存の `dist/node/src/index.js` は CommonJS 出力のため、Node ESM から package root を named import すると `Named export not found` で失敗していたため
- `dist/esm` をそのまま Node ESM に向けると extensionless directory import で壊れるため、CJS 上に薄い `.mjs` wrapper を置く方が安全だったため

### 20. Node renderer blank regression の解消と generator snapshot の再基準化

実施内容:

- `packages/converter/package.json` に `@napi-rs/canvas` を direct dependency として追加
- `packages/converter/src/index.node.ts` の render target を `canvas` から `@napi-rs/canvas` へ切り替え
- Node 側 `getDocument()` への custom `CanvasFactory` 注入をやめ、`pdfjs-dist` v5 のデフォルト Node 経路に寄せた
- `canvasToArrayBuffer` を `png` / `jpeg` ごとに明示 encode し、plain `ArrayBuffer` を返すよう修正
- `packages/converter/__tests__/index.test.ts` に「rendered image is not blank」を追加し、空入力 fixture も非空データへ修正
- `packages/generator/__tests__/__image_snapshots__/*.png` を、blank ではない corrected renderer 出力で再更新

理由:

- `canvas@3` を render target にした Node `pdf2img` は `pdfjs-dist` v5 下で白紙 PNG を返し、text / basePdf が描画されない regression を起こしていたため
- 同じ PDF を `@napi-rs/canvas` で描画すると内容が復元し、bbox と非白画素数も旧 snapshot に近いことを確認できたため
- `fe08c521` の snapshot 更新はこの regression を隠していたため、いったん撤回し、renderer 修正後にのみ再基準化する必要があったため

### 21. `common` / `manipulator` build の Vite 化と exports 再設計

実施内容:

- `packages/common/package.json` を `type: "module"` に変更
- `packages/common` に `vite.config.mts` と `tsconfig.build.json` を追加
- `packages/common` の build を `vite build && tsc -p tsconfig.build.json` に変更
- `packages/common` の export を `./dist/index.js` / `./dist/index.d.ts` に整理
- `packages/manipulator/package.json` を `type: "module"` に変更
- `packages/manipulator` に `vite.config.mts` と `tsconfig.build.json` を追加
- `packages/manipulator` の build を `vite build && tsc -p tsconfig.build.json` に変更
- `packages/manipulator` の export を `./dist/index.js` / `./dist/index.d.ts` に整理
- `packages/ui/tsconfig.json` の `@pdfme/common` path を `../common/dist` へ更新
- `packages/manipulator/__tests__/e2e/__image_snapshots__/*.png` を Vite build 移行後の renderer 出力で再更新
- `packages/pdf-lib/package.json` の `clean` を `rimraf --glob dist "src/**/*.d.ts"` に変更

理由:

- `PLAN.md` の `Phase 1` にある build の Vite library mode 化を安全な package から進めるため
- `common` / `manipulator` は multi-entry や browser/node dual entry がなく、最初の移行対象として安全だったため
- `vitest-image-snapshot` が内部で使う `pixelmatch@6` により、既存 manipulator snapshot と微小な AA 差分が出るため
- `pdf-lib/src/*.d.ts` の残骸が `lint:typecheck` / `lint:oxlint` を不安定にしていたため

### 22. `converter` / `schemas` / `generator` build の Vite 化と exports 再設計

実施内容:

- `packages/converter` に `src/index.ts` / `tsconfig.build.json` / `vite.config.mts` を追加
- `packages/converter` の build を Vite multi-entry (`index` / `index.node`) + declaration emit に変更
- `packages/converter/package.json` を `type: "module"` 化し、`browser` / `node` 条件付き export を `dist/index.js` / `dist/index.node.js` ベースへ整理
- `tsconfig.base.json` の `@pdfme/converter` path を `packages/converter/src/index.ts` に変更
- `packages/ui/vite.config.mts` の `@pdfme/converter` alias を `../converter/src/index.ts` に変更
- `packages/schemas` に `tsconfig.build.json` / `vite.config.mts` を追加
- `packages/schemas` の build を Vite multi-entry (`index` / `utils`) + declaration emit に変更
- `packages/schemas/package.json` を `type: "module"` 化し、root export と `./utils` export を `dist/index.js` / `dist/utils.js` ベースへ整理
- `packages/schemas/vite.config.mts` で `air-datepicker/locale/*` を external から外し、Node ESM でも壊れないようにした
- `packages/generator` に `tsconfig.build.json` / `vite.config.mts` を追加
- `packages/generator` の build を Vite library mode + declaration emit に変更
- `packages/generator/package.json` を `type: "module"` 化し、root export を `dist/index.js` / `dist/index.d.ts` ベースへ整理

理由:

- `PLAN.md` の `Phase 1` にある package build の Vite 化を、依存関係の浅い順に継続するため
- `converter` は browser/node dual entry を持つため、`common` / `manipulator` の次に整理する価値が高かったため
- `schemas` は public subpath が `.` と `./utils` に限られており、Vite multi-entry へ素直に移行できるため
- `schemas` は `air-datepicker/locale/*` の bare subpath import が Node ESM import を壊していたため、build 側で吸収する必要があったため
- `generator` は single entry で、`converter` / `schemas` の public export が安定した後に続けて移行しやすかったため

## Verification Completed

実行済み:

- `cd playground && npm install --ignore-scripts --no-audit --no-fund`
- `cd playground && node --input-type=module -e "import { getDefaultFont } from '@pdfme/common'; import { pdf2img } from '@pdfme/converter'; import { generate } from '@pdfme/generator'; import { text } from '@pdfme/schemas'; console.log(typeof getDefaultFont, typeof pdf2img, typeof generate, typeof text);"`
- `cd playground/node-playground && node generate.js`
- `cd playground/node-playground && node merge.js`
- `cd playground && node --check scripts/generate-templates-thumbnail.mjs`
- `cd packages/common && node set-version.cjs`
- `npm install --package-lock-only --workspace packages/converter @napi-rs/canvas@^0.1.97`
- `npm run typecheck`
- `npm run clean`
- `npm run typecheck`
- `npm run -w packages/ui build`
- `npm run build`
- `npm run test --workspace packages/common`
- `npm run test --workspace packages/manipulator`
- `npm run lint:typecheck`
- `npm run lint:oxlint`
- `npm run test --workspace packages/converter`
- `npm run test --workspace packages/schemas`
- `npm run test --workspace packages/pdf-lib`
- `npm run test --workspace packages/generator`
- `npm run test:update-snapshots --workspace packages/generator`
- `npm run test:update-snapshots --workspace packages/manipulator`
- `npm run -w packages/ui build`
- `npm run -w packages/pdf-lib build`
- `npm run -w packages/common build`
- `npm run -w packages/manipulator build`
- `npm run -w packages/converter build`
- `npm run -w packages/schemas build`
- `npm run -w packages/generator build`
- `node --input-type=module -e "import { PDFDocument } from '@pdfme/pdf-lib'; console.log(typeof PDFDocument);"`
- `node --input-type=module -e "import { BLANK_PDF } from '@pdfme/common'; import { merge } from '@pdfme/manipulator'; console.log(typeof BLANK_PDF, typeof merge);"`
- `node --input-type=module -e "import { pdf2img } from '@pdfme/converter'; import { text } from '@pdfme/schemas'; import { getDynamicHeightsForTable } from '@pdfme/schemas/utils'; import { generate } from '@pdfme/generator'; console.log(typeof pdf2img, typeof text, typeof getDynamicHeightsForTable, typeof generate);"`

確認できたこと:

- playground の local package link は `dist` ではなく package root を向いている
- public export 経由で `common` / `converter` / `generator` / `schemas` を import できる
- ESM 化した Node playground の `generate.js` は動作する
- `merge.js` も `manipulator` の export 修正後に動作する
- `generate-templates-thumbnail.mjs` は syntax check を通る
- `set-version.cjs` は期待どおり `src/version.ts` を更新できる
- `tsc -b` ベースの root typecheck が通る
- clean 後の `tsc -b` も通る
- ルート build が通る
- `ui` package は build と typecheck の分離後も単体 build が通る
- `common` の test は Vitest で通る
- `manipulator` の unit / e2e test は Vitest と `vitest-image-snapshot` で通る
- `common` / `manipulator` は Vite build 後も package root の ESM import が通る
- `converter` の test は Vitest で通る
- `schemas` の test は Vitest で通る
- `pdf-lib` の test は Vitest で通る
- root の `lint:typecheck` / `lint:oxlint` は `pdf-lib` / `ui` を含む全 package の `src` スコープで通る
- `converter` / `schemas` / `generator` は root build 後も package root の Node ESM import が通る
- generator の test 実行は local font asset 化により network 非依存になった
- `packages/converter` は `pdfjs-dist@5.5.207` / `canvas@3.2.1` 更新後でも、Node renderer を `@napi-rs/canvas` に寄せた状態で unit test が通る
- `generator` は `pdf2img failed: Image or Canvas expected` では落ちなくなり、blank snapshot を撤回したうえで corrected renderer 出力へ再基準化して test が再度通る
- `segmenterEnglish` / `multiVariableText` / `address-label-10` は bbox と非白画素数が旧 snapshot と近く、text / basePdf 描画が復元している
- `ui` build は `pdfjs-dist/webpack.mjs` への切り替え後に通る
- root build も `pdfjs-dist` / `canvas` 更新後の状態で再度通る
- `@pdfme/pdf-lib` は Node ESM から package root の named import が通る

## Files Changed So Far

- `README.md`
- `packages/common/package.json`
- `packages/common/set-version.cjs`
- `packages/manipulator/package.json`
- `playground/package.json`
- `playground/package-lock.json`
- `playground/node-playground/package.json`
- `playground/node-playground/generate.js`
- `playground/node-playground/merge.js`
- `playground/scripts/generate-templates-thumbnail.mjs`
- `package-lock.json`
- `website/sidebars.js`
- `website/docs/development-guide.md`
- `website/docs/migration-v6.md`
- `website/i18n/ja/docusaurus-plugin-content-docs/current/development-guide.md`
- `website/i18n/ja/docusaurus-plugin-content-docs/current/migration-v6.md`
- `package.json`
- `tsconfig.base.json`
- `tsconfig.json`
- `vitest.config.ts`
- `eslint.typecheck.config.mjs`
- `packages/common/tsconfig.cjs.json`
- `packages/common/tsconfig.esm.json`
- `packages/common/tsconfig.build.json`
- `packages/common/tsconfig.json`
- `packages/common/tsconfig.node.json`
- `packages/common/vite.config.mts`
- `packages/converter/tsconfig.cjs.json`
- `packages/converter/tsconfig.esm.json`
- `packages/converter/tsconfig.build.json`
- `packages/converter/tsconfig.json`
- `packages/converter/vite.config.mts`
- `packages/generator/tsconfig.cjs.json`
- `packages/generator/tsconfig.esm.json`
- `packages/generator/tsconfig.build.json`
- `packages/generator/tsconfig.json`
- `packages/generator/tsconfig.node.json`
- `packages/generator/vite.config.mts`
- `packages/manipulator/tsconfig.cjs.json`
- `packages/manipulator/tsconfig.esm.json`
- `packages/manipulator/tsconfig.build.json`
- `packages/manipulator/tsconfig.json`
- `packages/manipulator/vite.config.mts`
- `packages/pdf-lib/tsconfig.cjs.json`
- `packages/pdf-lib/tsconfig.esm.json`
- `packages/pdf-lib/tsconfig.json`
- `packages/pdf-lib/tsconfig.node.json`
- `packages/schemas/tsconfig.cjs.json`
- `packages/schemas/tsconfig.esm.json`
- `packages/schemas/tsconfig.build.json`
- `packages/schemas/tsconfig.json`
- `packages/schemas/tsconfig.node.json`
- `packages/schemas/vite.config.mts`
- `packages/ui/package.json`
- `packages/ui/tsconfig.json`
- `packages/ui/tsconfig.typecheck.json`
- `packages/ui/vite.config.mts`
- `packages/common/__tests__/dynamicTemplate.test.ts`
- `packages/common/__tests__/helper.test.ts`
- `packages/converter/package.json`
- `packages/converter/src/index.ts`
- `packages/converter/src/index.browser.ts`
- `packages/converter/src/index.node.ts`
- `packages/converter/__tests__/index.test.ts`
- `packages/converter/src/pdf2img.ts`
- `packages/converter/src/pdfjs-dist-webpack.d.ts`
- `packages/generator/package.json`
- `packages/generator/vitest.setup.ts`
- `packages/generator/__tests__/__image_snapshots__/*.png`
- `packages/generator/__tests__/assets/fonts/PinyonScript-Regular.ttf`
- `packages/generator/__tests__/assets/templates/index.ts`
- `packages/generator/__tests__/generate.test.ts`
- `packages/generator/__tests__/integration-other.test.ts`
- `packages/generator/__tests__/integration-playground.test.ts`
- `packages/generator/__tests__/integration-segmenter.test.ts`
- `packages/generator/__tests__/integration-textType.test.ts`
- `packages/generator/__tests__/__image_snapshots__/*.png`
- `packages/generator/__tests__/utils.ts`
- `packages/generator/src/generate.ts`
- `packages/generator/src/helper.ts`
- `packages/manipulator/__tests__/test-helpers.ts`
- `packages/manipulator/__tests__/e2e/insert.e2e.test.ts`
- `packages/manipulator/__tests__/e2e/merge.e2e.test.ts`
- `packages/manipulator/__tests__/e2e/move.e2e.test.ts`
- `packages/manipulator/__tests__/e2e/organize-complex.e2e.test.ts`
- `packages/manipulator/__tests__/e2e/organize-single.e2e.test.ts`
- `packages/manipulator/__tests__/e2e/remove.e2e.test.ts`
- `packages/manipulator/__tests__/e2e/rotate.e2e.test.ts`
- `packages/manipulator/__tests__/e2e/split.e2e.test.ts`
- `packages/manipulator/__tests__/e2e/__image_snapshots__/*.png`
- `packages/manipulator/vitest.setup.ts`
- `packages/pdf-lib/package.json`
- `packages/pdf-lib/write-node-esm-wrapper.cjs`
- `packages/pdf-lib/__tests__/api/PDFDocument.spec.ts`
- `packages/pdf-lib/__tests__/api/form/PDFForm.spec.ts`
- `packages/pdf-lib/__tests__/core/parser/PDFObjectParser.spec.ts`
- `packages/pdf-lib/__tests__/core/parser/PDFParser.spec.ts`
- `packages/pdf-lib/src/core/embedders/CustomFontEmbedder.ts`
- `packages/pdf-lib/src/core/embedders/CustomFontSubsetEmbedder.ts`
- `packages/schemas/package.json`
- `packages/schemas/__tests__/text.test.ts`
- `packages/schemas/src/date/helper.ts`
- `packages/schemas/src/barcodes/types.ts`
- `packages/schemas/src/multiVariableText/types.ts`
- `packages/schemas/src/tables/types.ts`
- `packages/schemas/src/text/types.ts`
- `packages/ui/src/components/Designer/RightSidebar/ListView/Item.tsx`
- `.gitignore`
- `eslint.config.mjs`

削除:

- `packages/common/set-version.js`
- `packages/manipulator/jest.setup.js`
- `packages/generator/jest.setup.js`

参考:

- `PLAN.md` は未編集
- `REVIEW.md` は未編集

## Remaining Work

### Priority 1: ルートレベルの新基盤導入

完了:

- ルート `package.json` の scripts 再編
- `vitest.config.ts` 追加
- `eslint.typecheck.config.mjs` 追加
- `vite` / `vitest` / `oxlint` 依存追加

補足:

- `package-lock.json` 更新済み
- `lint:typecheck` / `lint:oxlint` は `pdf-lib` / `ui` を含む全 package の `src` に適用済み
- warning は残るが、error は解消済み

### Priority 2: package ごとの Jest -> Vitest 移行

完了:

- `common`
- `converter`
- `generator`
- `manipulator`
- `pdf-lib`
- `schemas`
- `ui`

### Priority 3: package build の Vite 化

進行中:

- 完了: `common` / `manipulator` / `converter` / `schemas` / `generator`
- 残り: `pdf-lib` / `ui`

未実施:

- 残 package への `vite.config.ts` 追加
- 残 package の `package.json` exports 再設計
- `pdf-lib` / `ui` の build 置換方針整理

### Priority 4: playground の残件

未実施:

- playground 側 test 戦略の整理
- playground lint 方針の整理
- `scripts/generate-templates-list-json.mjs` を含めた周辺確認

現時点の状態:

- 内部 import 廃止は完了
- package root 参照化は完了
- ただし `Phase 1` で package exports を大きく変える場合は再確認が必要

### Priority 5: CLI / Skills

未着手:

- `@pdfme/cli`
- `pdfme generate`
- `pdfme validate`
- `pdfme inspect`
- `schema-info`
- `template create`
- `template add-field`
- Claude Code Skills

## Recommended Next Step

次のターンでは `PROGRESS.md` を起点にして、以下の順で進めるのが安全。

1. `PLAN.md` の `Phase 1` 残件として `pdf-lib` / `ui` の build 置換方針を固める
2. package build の Vite 化を完了させる
3. その後に lint warning と playground 追従確認を消化する

## Known Risks

- `PLAN.md` の Phase 1 は現状のまま一気に切り替えると変更範囲が広すぎる
- `converter` は browser/node entry と `pdfjs-dist` 更新が絡むため、単独で切り出して進めたほうが安全
- `playground` は package exports の変更に追従確認が必要
- `ui` の build は source alias と typecheck config 分離の上で成立しているため、次の移行ではこの構成を壊さないこと
- `lint:typecheck` は `PLAN.md` 準拠の最小ルールで全 package に適用済みだが、unused eslint-disable などの warning は残っている
- `manipulator` の snapshot runner は `vitest-image-snapshot` へ切り替わったため、今後 snapshot 更新時は生成される補助ディレクトリが変わること
- `pdfjs-dist` v5 の Node rasterize は `canvas` render target に戻すと白紙回帰するため、`packages/converter/src/index.node.ts` の `@napi-rs/canvas` 依存を安易に外さないこと
- generator の image snapshot は corrected renderer 出力へ再基準化済みであり、`fe08c521` の blank baseline を前提に見ないこと
- manipulator の e2e snapshot は Vite build 移行後の renderer 出力へ再基準化済みで、差分は文字エッジの AA 変化が主因だった
- `pdf-lib` の clean が効かない状態に戻ると stray `src/**/*.d.ts` が lint を壊すため、`packages/pdf-lib/package.json` の clean script を維持すること
- `schemas` の Node ESM import は `air-datepicker/locale/*` を Vite bundle 側へ取り込む前提で成立しているため、`packages/schemas/vite.config.mts` の external 判定を安易に戻さないこと
- `converter` / `schemas` / `generator` の単体 build は、workspace dependency の dist が無い clean 状態では root build order に依存すること

## Notes For Next Turn

- 次回はこの `PROGRESS.md` を読み、package build の Vite 化から進める
- まず `pdf-lib` / `ui` の build をどう Vite 化するか、既存 build の責務差分を確認してから着手する
