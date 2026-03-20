# PROGRESS

Last updated: 2026-03-20 JST

Latest committed checkpoint:

- `45082df0` `Add Vitest foundation for common and manipulator`

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
- `common` / `manipulator` / `converter` / `schemas` の Jest -> Vitest 移行

まだ未着手:

- `Phase 1` の残りである package ごとの Jest -> Vitest 移行
- type-aware lint / oxlint の適用範囲拡大
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

- `lint:typecheck` と `lint:oxlint` は現時点では `common` / `manipulator` にスコープ
- repo 全体へ広げるのは残 package 移行後に行う
- `vitest.config.ts` は workspace の `cwd` を見て `common` / `manipulator` の設定を切り替える構成

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

## Verification Completed

実行済み:

- `cd playground && npm install --ignore-scripts --no-audit --no-fund`
- `cd playground && node --input-type=module -e "import { getDefaultFont } from '@pdfme/common'; import { pdf2img } from '@pdfme/converter'; import { generate } from '@pdfme/generator'; import { text } from '@pdfme/schemas'; console.log(typeof getDefaultFont, typeof pdf2img, typeof generate, typeof text);"`
- `cd playground/node-playground && node generate.js`
- `cd playground/node-playground && node merge.js`
- `cd playground && node --check scripts/generate-templates-thumbnail.mjs`
- `cd packages/common && node set-version.cjs`
- `npm run typecheck`
- `npm run -w packages/ui build`
- `npm run build`
- `npm run test --workspace packages/common`
- `npm run test --workspace packages/manipulator`
- `npm run lint:typecheck`
- `npm run lint:oxlint`
- `npm run test --workspace packages/converter`
- `npm run test --workspace packages/schemas`

確認できたこと:

- playground の local package link は `dist` ではなく package root を向いている
- public export 経由で `common` / `converter` / `generator` / `schemas` を import できる
- ESM 化した Node playground の `generate.js` は動作する
- `merge.js` も `manipulator` の export 修正後に動作する
- `generate-templates-thumbnail.mjs` は syntax check を通る
- `set-version.cjs` は期待どおり `src/version.ts` を更新できる
- `tsc -b` ベースの root typecheck が通る
- ルート build が通る
- `ui` package は build と typecheck の分離後も単体 build が通る
- `common` の test は Vitest で通る
- `manipulator` の unit / e2e test は Vitest と `vitest-image-snapshot` で通る
- `converter` の test は Vitest で通る
- `schemas` の test は Vitest で通る
- root の `lint:typecheck` / `lint:oxlint` は `common` / `converter` / `manipulator` / `schemas` スコープで通る

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
- `packages/common/tsconfig.json`
- `packages/common/tsconfig.node.json`
- `packages/converter/tsconfig.cjs.json`
- `packages/converter/tsconfig.esm.json`
- `packages/converter/tsconfig.json`
- `packages/generator/tsconfig.cjs.json`
- `packages/generator/tsconfig.esm.json`
- `packages/generator/tsconfig.json`
- `packages/generator/tsconfig.node.json`
- `packages/manipulator/tsconfig.cjs.json`
- `packages/manipulator/tsconfig.esm.json`
- `packages/manipulator/tsconfig.json`
- `packages/pdf-lib/tsconfig.cjs.json`
- `packages/pdf-lib/tsconfig.esm.json`
- `packages/pdf-lib/tsconfig.json`
- `packages/pdf-lib/tsconfig.node.json`
- `packages/schemas/tsconfig.cjs.json`
- `packages/schemas/tsconfig.esm.json`
- `packages/schemas/tsconfig.json`
- `packages/schemas/tsconfig.node.json`
- `packages/ui/package.json`
- `packages/ui/tsconfig.json`
- `packages/ui/tsconfig.typecheck.json`
- `packages/ui/vite.config.mts`
- `packages/common/__tests__/dynamicTemplate.test.ts`
- `packages/common/__tests__/helper.test.ts`
- `packages/converter/package.json`
- `packages/manipulator/__tests__/test-helpers.ts`
- `packages/manipulator/__tests__/e2e/insert.e2e.test.ts`
- `packages/manipulator/__tests__/e2e/merge.e2e.test.ts`
- `packages/manipulator/__tests__/e2e/move.e2e.test.ts`
- `packages/manipulator/__tests__/e2e/organize-complex.e2e.test.ts`
- `packages/manipulator/__tests__/e2e/organize-single.e2e.test.ts`
- `packages/manipulator/__tests__/e2e/remove.e2e.test.ts`
- `packages/manipulator/__tests__/e2e/rotate.e2e.test.ts`
- `packages/manipulator/__tests__/e2e/split.e2e.test.ts`
- `packages/manipulator/vitest.setup.ts`
- `packages/schemas/package.json`
- `packages/schemas/__tests__/text.test.ts`
- `.gitignore`
- `eslint.config.mjs`

削除:

- `packages/common/set-version.js`
- `packages/manipulator/jest.setup.js`

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
- `lint:typecheck` / `lint:oxlint` は現状 `common` / `converter` / `manipulator` / `schemas` スコープ
- full repo への拡張は残 package 移行後に行う

### Priority 2: package ごとの Jest -> Vitest 移行

完了:

- `common`
- `converter`
- `manipulator`
- `schemas`

未実施:

- `generator`
- `ui`
- `pdf-lib`

特に重い package:

- `ui`
- `generator`
- `pdf-lib`

理由:

- jsdom
- `__mocks__`
- `jest.*` API
- CommonJS mock file
- alias / mapper

### Priority 3: package build の Vite 化

未実施:

- 各 package の `vite.config.ts` 追加
- `package.json` の exports 再設計
- `converter` の browser/node dual entry 整理
- `schemas` の multi-entry 対応

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

1. `generator` を Jest -> Vitest 移行
2. `lint:typecheck` / `lint:oxlint` の対象を `generator` まで広げる
3. `ui` と `pdf-lib` は最後に回す

## Known Risks

- `PLAN.md` の Phase 1 は現状のまま一気に切り替えると変更範囲が広すぎる
- `pdf-lib` と `ui` の test migration は別途まとまった工数が必要
- `converter` は browser/node entry と `pdfjs-dist` 更新が絡むため、単独で切り出して進めたほうが安全
- `playground` は package exports の変更に追従確認が必要
- `ui` の build は source alias と typecheck config 分離の上で成立しているため、次の移行ではこの構成を壊さないこと
- `lint:typecheck` を full repo に広げると既存 package 由来の大量エラーが出るため、package migration とセットで広げること
- `manipulator` の snapshot runner は `vitest-image-snapshot` へ切り替わったため、今後 snapshot 更新時は生成される補助ディレクトリが変わること

## Notes For Next Turn

- 次回はこの `PROGRESS.md` を読み、`Priority 2` の `generator` から順に進める
- 既存の未コミット差分として `PLAN.md` と `REVIEW.md` があるため、触らないこと
