# PLAN.md レビュー

## 総評

方向性自体は妥当です。特に「ビルド/テスト高速化」と「PDF検証ループのCLI化」は、pdfme の開発体験をかなり改善できます。

ただし、現状の `PLAN.md` はそのまま着手すると実装途中で確実に詰まる箇所が複数あります。大きく分けると次の4系統です。

1. Phase 1 のパッケージング/型解決/ブラウザ互換性の前提がまだ固まっていない
2. Playground と既存ドキュメント/サンプルの追従範囲が過小
3. Jest→Vitest 移行工数がかなり過小見積もり
4. Phase 2 CLI の `--grid` / `--diff` / optional `canvas` 設計に穴がある

このレビューでは、まず「実装ブロッカー or 実装中に高確率で破綻するもの」を優先して挙げます。その後、PLAN に最低限追記すべき決定事項をまとめます。

## 指摘事項

### 1. 重大: `type: "module"` 化と `set-version.js`、およびルート `build` の直呼びが衝突しています

該当:

- [PLAN.md#L57](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L57)
- [PLAN.md#L71](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L71)
- [PLAN.md#L204](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L204)
- [packages/common/package.json#L37](/Users/kyoheifukuda/Develop/pdfme/packages/common/package.json#L37)
- [packages/common/set-version.js#L1](/Users/kyoheifukuda/Develop/pdfme/packages/common/set-version.js#L1)

問題:

- `@pdfme/common` は現在 `prebuild: "node set-version.js"` に依存しています。
- その `set-version.js` は CommonJS (`require(...)`) です。
- プランでは package に `type: "module"` を入れるので、このままだと `node set-version.js` は即壊れます。
- さらにルート `build` は `npm run -w packages/common build` ではなく `vite build -c packages/common/vite.config.ts` を直呼びしているため、`prebuild` 自体も走りません。

この2点が重なるので、現行のバージョン埋め込みは確実に失われます。

必要な修正:

- `set-version.js` を `.cjs` に変えるか ESM に書き換える
- ルート `build:*` は `vite build -c ...` 直呼びではなく、各 workspace の `npm run build -w ...` を使って lifecycle を維持する
- `dev` でも version 埋め込みが必要なら、その代替手段も明記する

### 2. 重大: `tsc --noEmit` 分離は、現状の型解決前提では成立しません

該当:

- [PLAN.md#L23](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L23)
- [PLAN.md#L83](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L83)
- [PLAN.md#L105](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L105)
- [PLAN.md#L627](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L627)
- [PLAN.md#L844](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L844)
- [tsconfig.base.json#L18](/Users/kyoheifukuda/Develop/pdfme/tsconfig.base.json#L18)
- [packages/ui/tsconfig.json#L20](/Users/kyoheifukuda/Develop/pdfme/packages/ui/tsconfig.json#L20)
- [packages/common/package.json#L27](/Users/kyoheifukuda/Develop/pdfme/packages/common/package.json#L27)
- [packages/generator/package.json#L27](/Users/kyoheifukuda/Develop/pdfme/packages/generator/package.json#L27)

問題:

- ルート `tsconfig.json` に `references` を置いていますが、各 package 側に `composite: true` がありません。
- `tsconfig.base.json` はまだ `types: ["node", "jest"]` のままです。
- `packages/ui/tsconfig.json` も `types: ["jest"]` のままです。
- さらにプランは generator の path mapping を削除し、`tsc --noEmit` を build より前に回そうとしています。
- しかし package 間 import は現在 package exports 経由で `dist/*` を向いています。clean checkout で build 前に `tsc --noEmit` を回すと、解決不能になる可能性が高いです。

必要な修正:

- まず「workspace 間の型解決を source に向けるのか」「project references で解くのか」を先に確定する
- project references で行くなら各 package を `composite` 化する
- `jest` 型は base から除去し、Vitest 側は `vitest/globals` か明示 import に寄せる
- `moduleResolution` も `node` のままでよいのか再設計する

### 3. 重大: `build.target: "node20"` は browser 向け package に不適切です

該当:

- [PLAN.md#L186](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L186)
- [PLAN.md#L279](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L279)
- [PLAN.md#L385](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L385)
- [PLAN.md#L489](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L489)
- [PLAN.md#L577](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L577)
- [website/docs/converter.md#L3](/Users/kyoheifukuda/Develop/pdfme/website/docs/converter.md#L3)
- [website/docs/getting-started.md#L207](/Users/kyoheifukuda/Develop/pdfme/website/docs/getting-started.md#L207)
- [packages/converter/src/index.browser.ts#L1](/Users/kyoheifukuda/Develop/pdfme/packages/converter/src/index.browser.ts#L1)

問題:

- `@pdfme/converter` は browser entry を持っています。
- `@pdfme/generator` も docs 上は browser 対応です。
- `@pdfme/common`, `@pdfme/schemas`, `@pdfme/ui` も browser 消費前提です。
- それなのに各 package の Vite target を `node20` にしてしまうと、Node 20 を前提にした構文/出力が browser bundle に混ざる設計になります。

Node 20 を「サポート対象の最低 Node バージョン」にするのは別の話です。build target は package の実行環境別に設計しないといけません。

必要な修正:

- browser 向け package は browser baseline (`es2020` 相当など) にする
- node 専用 package (`cli` など) だけ `node20` target にする
- `converter` は browser/node の entry ごとに target と出力前提を分ける

### 4. 重大: ESM-only 化は Node 20 以上にする以上の破壊的変更です

該当:

- [PLAN.md#L205](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L205)
- [PLAN.md#L307](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L307)
- [PLAN.md#L506](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L506)
- [PLAN.md#L604](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L604)
- [PLAN.md#L700](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L700)
- [PLAN.md#L787](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L787)
- [packages/common/package.json#L27](/Users/kyoheifukuda/Develop/pdfme/packages/common/package.json#L27)
- [packages/generator/package.json#L27](/Users/kyoheifukuda/Develop/pdfme/packages/generator/package.json#L27)
- [packages/manipulator/package.json#L27](/Users/kyoheifukuda/Develop/pdfme/packages/manipulator/package.json#L27)
- [playground/node-playground/generate.js#L1](/Users/kyoheifukuda/Develop/pdfme/playground/node-playground/generate.js#L1)

問題:

- 現在の package は `require` 条件を提供しています。
- Node playground の例も `require('@pdfme/...')` 前提です。
- それを落とすなら、`main` を残すだけでは後方互換にはなりません。
- 実質的には「CJS 消滅」「internal dist path 消滅」「Node example 全面書き換え」です。

必要な修正:

- breaking changes として明文化する
- CJS 廃止の migration guide を Phase 1 に含める
- README / docs / example / playground scripts の追従を明示タスク化する

### 5. 高: Playground の更新範囲が過小です

該当:

- [PLAN.md#L849](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L849)
- [playground/package.json#L18](/Users/kyoheifukuda/Develop/pdfme/playground/package.json#L18)
- [playground/scripts/generate-templates-thumbnail.mjs#L6](/Users/kyoheifukuda/Develop/pdfme/playground/scripts/generate-templates-thumbnail.mjs#L6)

問題:

- プランは `file:../packages/*/dist` を package root に変える話しかしていません。
- しかし実際の thumbnail 生成スクリプトは `@pdfme/generator/cjs/src/index.js` など内部パスを直 import しています。
- ESM-only 化後はここがそのまま壊れます。
- `playground/node-playground` も CJS 前提です。

必要な修正:

- playground を「依存参照変更」だけでなく「内部 import 廃止」まで含めて移行タスク化する
- 可能なら playground scripts も public exports のみ使うようにする

### 6. 高: ESLint 削除方針のままだと playground lint が壊れます

該当:

- [PLAN.md#L45](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L45)
- [PLAN.md#L125](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L125)
- [playground/package.json#L8](/Users/kyoheifukuda/Develop/pdfme/playground/package.json#L8)
- [eslint.config.mjs#L1](/Users/kyoheifukuda/Develop/pdfme/eslint.config.mjs#L1)
- [packages/ui/eslint.config.mjs#L1](/Users/kyoheifukuda/Develop/pdfme/packages/ui/eslint.config.mjs#L1)

問題:

- playground は今も `eslint` を実行します。
- repo の shared config は root `eslint.config.mjs` です。
- UI package では React / hooks ルールも追加しています。
- プラン通り root/package の ESLint config を全部消すと、`cd playground && npm run lint` というチェックリスト自体が成立しません。

必要な修正:

- 「repo packages は Oxlint、playground は ESLint 維持」にするか
- 「playground も別途 Oxlint に寄せる」なら、その設計/設定/互換確認を明示する
- 少なくとも React/hook ルールを捨てるのか維持するのかは決める

### 7. 高: converter の export map 提案は TypeScript 解決で破綻する可能性が高いです

該当:

- [PLAN.md#L402](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L402)
- [packages/converter/package.json#L27](/Users/kyoheifukuda/Develop/pdfme/packages/converter/package.json#L27)

問題:

- 現行は `types` が top-level sibling です。
- プランは `browser` / `node` / `default` の中に `types` をネストしています。
- これは TS の解決で読み取られない可能性があります。

必要な修正:

- `types` は top-level condition に置く前提で export map を再設計する
- browser/node dual entry の型解決ポリシーを先に検証する

### 8. 高: Jest→Vitest 移行の作業量が過小評価されています

該当:

- [PLAN.md#L241](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L241)
- [PLAN.md#L329](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L329)
- [PLAN.md#L624](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L624)
- [PLAN.md#L722](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L722)
- [packages/schemas/__tests__/text.test.ts#L52](/Users/kyoheifukuda/Develop/pdfme/packages/schemas/__tests__/text.test.ts#L52)
- [packages/ui/__tests__/assets/helper.ts#L8](/Users/kyoheifukuda/Develop/pdfme/packages/ui/__tests__/assets/helper.ts#L8)
- [packages/ui/__tests__/components/PluginIcon.test.tsx#L12](/Users/kyoheifukuda/Develop/pdfme/packages/ui/__tests__/components/PluginIcon.test.tsx#L12)
- [packages/ui/__mocks__/form-render.js#L1](/Users/kyoheifukuda/Develop/pdfme/packages/ui/__mocks__/form-render.js#L1)
- [packages/pdf-lib/__tests__/api/PDFDocument.spec.ts#L50](/Users/kyoheifukuda/Develop/pdfme/packages/pdf-lib/__tests__/api/PDFDocument.spec.ts#L50)

問題:

- `jest.fn()` 置換だけでは終わりません。
- `jest.spyOn`, `jest.mock`, `jest.clearAllMocks`, `jest.Mock`, CommonJS mocks, `require()` 依存、`@jest-environment` pragma が各所にあります。
- UI は `__mocks__` が `.js` CommonJS のままで、package を `type: module` にするとここも巻き込まれます。

必要な修正:

- package ごとの test migration checklist を用意する
- 特に `ui`, `schemas`, `pdf-lib`, `manipulator` は別枠で見積もる
- `vitest-image-snapshot` と通常 snapshot の互換も先に検証する

### 9. 高: CLI `--grid` は multi-input / multi-page で設計が破綻しています

該当:

- [PLAN.md#L963](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L963)
- [PLAN.md#L1372](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L1372)
- [packages/generator/src/helper.ts#L19](/Users/kyoheifukuda/Develop/pdfme/packages/generator/src/helper.ts#L19)

問題:

- 擬似コードでは生成された各 image に対して `pageIndex = i` を渡しています。
- しかし overlay 側は `template.schemas[pageIndex]` をそのまま参照しています。
- これでは `inputs.length > 1` の時点で output page index と template page index が一致しません。
- さらに blank PDF の `staticSchema` も overlay 対象に入っていません。

必要な修正:

- `output page` と `template page` の対応付けを設計し直す
- 必要なら generate 側から page metadata を返す
- `staticSchema` をどう描くかも仕様化する

### 10. 中: CLI の diff 閾値仕様が自己矛盾しています

該当:

- [PLAN.md#L933](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L933)
- [PLAN.md#L981](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L981)
- [PLAN.md#L1019](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L1019)
- [PLAN.md#L1430](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L1430)

問題:

- `threshold` は `0-1` と書かれている
- でも擬似コードは `diffPercent > threshold`
- 実装例は `diffPercent` を 0-100 にして `threshold * 100` と比較
- JSON 例では `threshold: 0.1` なのに `diffPercent: 5.41` が fail 扱い

このままだと CLI 利用者もテストも一貫しません。

必要な修正:

- `threshold` を「0-1 の ratio」にするか「0-100 の percent」にするかを一つに固定する
- JSON output も同じ単位に揃える

### 11. 中: CLI の ESM テスト例と argv 受け渡しに問題があります

該当:

- [PLAN.md#L1173](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L1173)
- [PLAN.md#L1198](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L1198)
- [PLAN.md#L1710](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L1710)

問題:

- `type: "module"` 前提の package なのに test sample が `__dirname` を使っています
- `remaining = process.argv.slice(3)` は parse 済みオプション構造を捨てていて、global flag の位置に依存します

必要な修正:

- テストは `fileURLToPath(import.meta.url)` ベースにする
- サブコマンド引数は `parseArgs` の結果を元に明示的に再構成する

### 12. 高: optional `canvas` の扱いが end-to-end で閉じていません

該当:

- [PLAN.md#L1631](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L1631)
- [PLAN.md#L1654](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L1654)
- [packages/converter/src/index.node.ts#L4](/Users/kyoheifukuda/Develop/pdfme/packages/converter/src/index.node.ts#L4)

問題:

- `canvas` を optional にしても、Node converter entry は module load 時に `import { createCanvas } from 'canvas'` しています
- CLI が converter を top-level import すると、`--image` を使わないコマンドでも落ちます

必要な修正:

- `--image` / `--grid` の時だけ converter / canvas を dynamic import する
- install failure 時の error message だけでなく、import timing も設計する

### 13. 中: CLI font config が既存 API より後退しています

該当:

- [PLAN.md#L1491](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L1491)
- [packages/common/src/types.ts#L177](/Users/kyoheifukuda/Develop/pdfme/packages/common/src/types.ts#L177)

問題:

- 現行 `Font` 型は `subset` を持ちます
- CLI の `FontConfig` には `subset` がありません

必要な修正:

- `subset?: boolean` を CLI config schema に入れる

### 14. 中: `validate` の追加ルールは仕様を詰めてから実装すべきです

該当:

- [PLAN.md#L1034](/Users/kyoheifukuda/Develop/pdfme/PLAN.md#L1034)
- [packages/generator/src/helper.ts#L87](/Users/kyoheifukuda/Develop/pdfme/packages/generator/src/helper.ts#L87)

問題:

- プランは「スキーマ名の重複」チェックを追加したいとしています
- しかし current generator はページ横断で schema name をまとめて扱う実装で、同名 field を複数ページに置くユースケースを完全には否定していません

必要な修正:

- 「どの重複を invalid とするのか」を先に決める
- 位置妥当性も error なのか warning なのか定義する

## 実装前に決めるべきこと

### A. サポートポリシー

- Node 20 以上にするのは「runtime support policy」なのか「browser bundle target」まで含むのか
- CJS 廃止を正式 breaking change として扱うのか
- `@pdfme/ui` の React 16 サポートを本当に切るのか。現行は React 16 依存です: [packages/ui/package.json#L49](/Users/kyoheifukuda/Develop/pdfme/packages/ui/package.json#L49)

### B. 型解決戦略

- workspace package import を source に向けるか
- それとも strict な project references + composite に寄せるか
- Vitest 実行時も build 前 source を直接参照できる形にするか

### C. CLI のスコープ

- built-in schema のみ対応でよいのか
- custom plugin を渡す module path (`--plugins ./plugins.mjs` など) が必要か
- `validate` / `inspect` は warning 概念を持つのか

## PLAN.md に最低限反映したい修正

1. Phase 1 の前に「互換性方針」を1節追加する
2. ルート `build` は workspace scripts を呼ぶ形に変え、clean/prebuild を保持する
3. `typecheck` は最初に設計し直し、`composite` / `paths` / `moduleResolution` を明記する
4. browser 向け package と node 向け package で build target を分ける
5. playground/doc/examples の追従を Phase 1 の正式タスクに格上げする
6. Jest→Vitest は package 単位で migration checklist を書く
7. Phase 2 は `grid`, `diff`, optional `canvas`, ESM test path の仕様を先に修正する

## 結論

今の `PLAN.md` は「方向性の合意」には十分ですが、「このまま実装開始して最後まで到達できるレベル」にはまだ達していません。

優先度順に言うと、先に直すべきなのは次です。

1. package lifecycle と `type: module` の衝突整理
2. typecheck / module resolution 戦略の確定
3. browser support を壊さない build target 設計
4. playground / docs / examples を含めた breaking change 追従範囲の明文化
5. CLI `--grid` / `--diff` / optional `canvas` の再設計

この5点を `PLAN.md` に反映できれば、かなり実装に着手しやすい計画になります。
