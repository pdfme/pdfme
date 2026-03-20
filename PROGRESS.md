# PROGRESS

Last updated: 2026-03-20 JST

## Current Status

`PLAN.md` のうち、まず安全に着手できる `Phase 0` と playground 周辺のブロッカー解消を実装済み。

まだ未着手:

- `Phase 1` の本体である Vite / Vitest / Oxlint への全面移行
- ルート `tsconfig.json` + project references + `composite` 化
- Jest 依存の package ごとの移行
- CLI (`Phase 2`)
- Claude Code Skills (`Phase 3`)

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

## Verification Completed

実行済み:

- `cd playground && npm install --ignore-scripts --no-audit --no-fund`
- `cd playground && node --input-type=module -e "import { getDefaultFont } from '@pdfme/common'; import { pdf2img } from '@pdfme/converter'; import { generate } from '@pdfme/generator'; import { text } from '@pdfme/schemas'; console.log(typeof getDefaultFont, typeof pdf2img, typeof generate, typeof text);"`
- `cd playground/node-playground && node generate.js`
- `cd playground/node-playground && node merge.js`
- `cd playground && node --check scripts/generate-templates-thumbnail.mjs`
- `cd packages/common && node set-version.cjs`

確認できたこと:

- playground の local package link は `dist` ではなく package root を向いている
- public export 経由で `common` / `converter` / `generator` / `schemas` を import できる
- ESM 化した Node playground の `generate.js` は動作する
- `merge.js` も `manipulator` の export 修正後に動作する
- `generate-templates-thumbnail.mjs` は syntax check を通る
- `set-version.cjs` は期待どおり `src/version.ts` を更新できる

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
- `website/sidebars.js`
- `website/docs/development-guide.md`
- `website/docs/migration-v6.md`
- `website/i18n/ja/docusaurus-plugin-content-docs/current/development-guide.md`
- `website/i18n/ja/docusaurus-plugin-content-docs/current/migration-v6.md`

削除:

- `packages/common/set-version.js`

参考:

- `PLAN.md` は未編集
- `REVIEW.md` は未編集

## Remaining Work

### Priority 1: Phase 1 の設計を実装可能な単位へ落とす

次に着手すべき内容:

1. ルート `tsconfig.json` を追加
2. 各 package の `tsconfig.json` を `composite` + `references` ベースへ整理
3. `tsconfig.base.json` から `jest` 型を外す
4. package 間の型解決が clean checkout で成立する形へ揃える

注意:

- ここを固める前に `vitest` や `vite` の build scripts へ大きく切り替えると破綻しやすい
- 特に `generator` / `ui` の path 解決が現状のボトルネック

### Priority 2: ルートレベルの新基盤導入

未実施:

- ルート `package.json` の scripts 再編
- `typecheck` 追加
- `vitest.config.ts` 追加
- `eslint.typecheck.config.mjs` 追加
- `vite` / `vitest` / `oxlint` 依存追加

補足:

- この段階では `package-lock.json` の更新が発生する
- `vitest` / `oxlint` はまだ install していない

### Priority 3: package ごとの Jest -> Vitest 移行

未実施:

- `common`
- `converter`
- `schemas`
- `generator`
- `manipulator`
- `ui`
- `pdf-lib`

特に重い package:

- `ui`
- `generator`
- `manipulator`
- `pdf-lib`

理由:

- image snapshot
- jsdom
- `__mocks__`
- `jest.*` API
- CommonJS mock file
- alias / mapper

### Priority 4: package build の Vite 化

未実施:

- 各 package の `vite.config.ts` 追加
- `package.json` の exports 再設計
- `converter` の browser/node dual entry 整理
- `schemas` の multi-entry 対応

### Priority 5: playground の残件

未実施:

- playground 側 test 戦略の整理
- playground lint 方針の整理
- `scripts/generate-templates-list-json.mjs` を含めた周辺確認

現時点の状態:

- 内部 import 廃止は完了
- package root 参照化は完了
- ただし `Phase 1` で package exports を大きく変える場合は再確認が必要

### Priority 6: CLI / Skills

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

1. ルート `tsconfig.json` を追加
2. 各 package を `composite` + `references` に寄せる
3. `tsconfig.base.json` の `jest` 型依存を外す
4. clean build 前提で `tsc -b` が通る状態を作る
5. その後に `vitest` / `oxlint` / `vite` へ進む

## Known Risks

- `PLAN.md` の Phase 1 は現状のまま一気に切り替えると変更範囲が広すぎる
- `pdf-lib` と `ui` の test migration は別途まとまった工数が必要
- `converter` は browser/node entry と `pdfjs-dist` 更新が絡むため、単独で切り出して進めたほうが安全
- `playground` は package exports の変更に追従確認が必要

## Notes For Next Turn

- 次回はこの `PROGRESS.md` を読み、`Priority 1` から順に進める
- 既存の未コミット差分として `PLAN.md` と `REVIEW.md` があるため、触らないこと
