# pdfme AI駆動開発基盤 — 実装計画書 v2

## Context

pdfme開発における2つのボトルネック:
1. **ビルド/テストが遅い** — tsc×18回ビルド、Jest + ts-jest変換、ESLint（JS製）
2. **変更検証が遅い** — エージェントがPDF出力を自律的に検証できない

本計画は4フェーズで解決する:
- **Phase 0**: 互換性方針の確定（破壊的変更の整理）
- **Phase 1**: Vite / Vitest / Oxlint 移行でビルド/テスト/リントを高速化
- **Phase 2**: @pdfme/cli でエージェントの自律的PDF検証ループを構築
- **Phase 3**: Claude Code Skills で繰り返しワークフローを自動化

> 注: 「Vite+」はVoidZeroが開発中の統合CLI製品（2026年プレビュー段階）。
> 本計画では Vite + Vitest + Oxlint を個別にインストールする。
> Vite+が安定版になった段階で統合CLIへの移行を検討する。

---

# Phase 0: 互換性方針の確定

Phase 1着手前に、以下の破壊的変更方針を確定しドキュメント化する。

## 0.1 Breaking Changes一覧

| 変更 | 影響範囲 | 移行ガイド |
|------|---------|-----------|
| **ESM-only化**（CJS/UMD廃止） | `require('@pdfme/...')` を使う全ユーザー | `require()` → `import` への書き換え手順 |
| **Node 20+最低要件** | Node 16/18ユーザー | Node 20 LTSへの更新案内 |
| **React 18+**（UIパッケージ） | React 16/17ユーザー | React 18への更新案内 |
| **dist内部パス廃止** | `@pdfme/*/dist/cjs/src/...` を直接importするユーザー | package exports のみを使用するよう変更 |

## 0.2 サポートポリシー

| 項目 | 方針 |
|------|------|
| **ランタイム** | Node 20+（ランタイム最低要件） |
| **ブラウザ** | 引き続きサポート（es2020ターゲット） |
| **ビルドターゲット** | ブラウザ向けパッケージ: `es2020` / Node専用パッケージ（CLI）: `node20` |
| **React** | 18+（UIパッケージ、React 16サポート廃止） |
| **モジュール形式** | ESM-only（CJS/UMD廃止） |

## 0.3 事前準備タスク

1. [ ] GitHub DiscussionまたはIssueで方針を事前告知
2. [ ] マイグレーションガイドのドラフト作成
3. [ ] `playground/node-playground/generate.js` をESMに書き換え（`require` → `import`）
4. [ ] `packages/common/set-version.js` を ESMに書き換え（`require` → `import`）、または `.cjs` にリネーム
5. [ ] README / docs / website の更新対象ページを洗い出し

---

# Phase 1: Vite / Vitest / Oxlint 移行（メジャーバージョンアップ）

## 1.1 移行の全体像

| 要素 | 現在 | 移行後 |
|------|------|--------|
| ビルド | tsc × 18回（CJS/ESM/Node） | Vite library mode × 8（ESM-only） |
| 型生成 | tscビルドに内包 | `tsc --emitDeclarationOnly`（ビルドと分離） |
| 型チェック | ビルドに内包 | `tsc -b`（project references） |
| テスト | Jest 29 + ts-jest | Vitest 4（ESMネイティブ） |
| リント | ESLint 9 + @typescript-eslint | Oxlint + ESLint（型認識ルールのみ） |
| フォーマット | Prettier | Prettier（変更なし） |
| 設定ファイル | 36 | 約12 |
| 出力 | CJS + ESM + Node（26.5MB） | ESM-only（~9MB） |

## 1.2 追加する開発依存パッケージ（ルート）

```
vite@^7                     # ビルドツール（v7安定、v8のRolldown移行はリスクが大きいため次回検討）
vitest@^4                   # テストフレームワーク
oxlint                      # Rustベースリンター（syntax-level）
```

パッケージ別:
```
vitest-image-snapshot       # generator, manipulator用
vitest-canvas-mock          # ui用
```

**vite-plugin-dts は使用しない。** モノレポでのrootDir問題があるため、型定義は `tsc --emitDeclarationOnly` で生成（UIパッケージの既存パターンと同じ）。

## 1.3 削除する開発依存パッケージ

```
jest, ts-jest, ts-jest-resolver, jest-environment-jsdom
jest-image-snapshot, jest-canvas-mock, @types/jest
```

**ESLintは完全削除しない:**
- Oxlintは`@typescript-eslint/recommended`のsyntaxルールをカバー
- 型認識ルール（`no-floating-promises`, `no-misused-promises`, `await-thenable`等）は未対応
- → ESLintは型認識ルール専用として維持、Oxlintをfast first passとして併用
- playgroundのReact/hooksルールもESLintで維持

## 1.4 型解決戦略: Project References + composite

### ルート tsconfig.json

```jsonc
{
  "files": [],
  "references": [
    { "path": "packages/pdf-lib" },
    { "path": "packages/common" },
    { "path": "packages/converter" },
    { "path": "packages/schemas" },
    { "path": "packages/generator" },
    { "path": "packages/manipulator" },
    { "path": "packages/ui" }
  ]
}
```

### 各パッケージの tsconfig.json

```jsonc
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "dist",
    "declaration": true,
    "declarationDir": "dist",
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ES2020"
  },
  "include": ["src"],
  "references": [
    // 依存する他のpdfmeパッケージを列挙
  ]
}
```

### tsconfig.base.json の修正

```diff
- "types": ["node", "jest"]
+ "types": ["node"]
```

Vitestの型は `/// <reference types="vitest/globals" />` で解決。

## 1.5 ルートレベルの変更

### package.json

```jsonc
{
  "type": "module",
  "workspaces": [
    "packages/pdf-lib", "packages/common", "packages/converter",
    "packages/schemas", "packages/generator", "packages/manipulator", "packages/ui"
  ],
  "scripts": {
    "clean": "rimraf packages/*/dist",
    "build": "npm run build:pdf-lib && npm run build:common && npm run build:converter && npm run build:schemas && run-p build:generator build:ui build:manipulator",
    "build:pdf-lib": "npm run build -w packages/pdf-lib",
    "build:common": "npm run build -w packages/common",
    "build:converter": "npm run build -w packages/converter",
    "build:schemas": "npm run build -w packages/schemas",
    "build:generator": "npm run build -w packages/generator",
    "build:manipulator": "npm run build -w packages/manipulator",
    "build:ui": "npm run build -w packages/ui",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "oxlint . && eslint --config eslint.typecheck.config.mjs .",
    "typecheck": "tsc -b",
    "prettier": "prettier --write ."
  }
}
```

**重要な変更点:**
- `build:*` は `npm run build -w packages/xxx`（prebuild等のlifecycle維持）
- 並列ビルドは `run-p`（npm-run-all2維持、`&`+`wait`はWindows非対応）
- `typecheck` は `tsc -b`（project references）

### vitest.config.ts（ルート）

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/common', 'packages/pdf-lib', 'packages/converter',
      'packages/schemas', 'packages/generator', 'packages/manipulator', 'packages/ui',
    ],
  },
});
```

> `vitest.workspace.ts` と `defineWorkspace` はVitest 3.2で非推奨。Vitest 4では `projects` が正式API。

### eslint.typecheck.config.mjs（型認識ルール専用）

```javascript
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [{
  files: ['packages/*/src/**/*.ts', 'packages/*/src/**/*.tsx'],
  plugins: { '@typescript-eslint': tsPlugin },
  languageOptions: { parser: tsParser, parserOptions: { project: true } },
  rules: {
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
  },
}];
```

## 1.6 パッケージ別移行

### 各パッケージ共通パターン

**vite.config.ts（ブラウザ向け）:**
```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
    outDir: 'dist',
    rollupOptions: { external: [/* 依存 */] },
    target: 'es2020',  // ← ブラウザ向け（node20はCLIのみ）
    minify: false, sourcemap: true,
  },
  test: { globals: true, environment: 'node' },
});
```

**package.json build:**
```jsonc
{
  "scripts": {
    "build": "vite build && tsc --emitDeclarationOnly",
    "dev": "vite build --watch"
  }
}
```

**exports（TypeScript解決順序）:**
```jsonc
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",  // ← typesを最初に（TS解決優先）
      "import": "./dist/index.js"
    }
  }
}
```

### image snapshot移行（manipulator, generator）

**vitest.setup.ts（正しいAPI）:**
```typescript
import { imageMatcher } from 'vitest-image-snapshot';
imageMatcher();
// ※ expect.extend({ toMatchImageSnapshot }) ではない
```

**テストコード:**
```diff
- expect(images[i]).toMatchImageSnapshot({ customSnapshotIdentifier: `${name}-${i}` });
+ await expect(images[i]).toMatchImage(`${name}-${i}`);
```

### converter: pdfjs-dist v4アップグレード + export map

**pdfjs-dist v3→v4:** UMD→ESM native。importパス変更あり、事前調査必要。

**export map（types top-level配置）:**
```jsonc
{
  "exports": {
    ".": {
      "types": "./dist/index.node.d.ts",
      "browser": { "types": "./dist/index.browser.d.ts", "import": "./dist/index.browser.js" },
      "node": { "import": "./dist/index.node.js" },
      "default": { "import": "./dist/index.browser.js" }
    }
  }
}
```

### schemas: マルチエントリ

```typescript
// vite.config.ts
entry: { index: 'src/index.ts', utils: 'src/utils.ts' },
// manualChunksを無効化して不要なchunk生成を防止
rollupOptions: { output: { manualChunks: undefined } },
```

### Jest→Vitest 移行チェックリスト

各パッケージで:
- [ ] `jest.fn()` → `vi.fn()`
- [ ] `jest.spyOn()` → `vi.spyOn()`
- [ ] `jest.mock()` → `vi.mock()`
- [ ] `jest.clearAllMocks()` → `vi.clearAllMocks()`
- [ ] `jest.Mock` 型 → `Mock` from vitest
- [ ] `@jest-environment` pragma → Vitest `environment`
- [ ] `__mocks__/*.js` → `.ts`（type:module対応）
- [ ] `require()` in tests → `import`
- [ ] `moduleNameMapper` → `resolve.alias`
- [ ] `toMatchImageSnapshot` → `imageMatcher()` + `toMatchImage()`
- [ ] snapshot再生成: `vitest run --update`

## 1.7 Playground 移行（正式タスク）

1. [ ] `file:../packages/*/dist` → `file:../packages/*`
2. [ ] `node-playground/generate.js` ESM化
3. [ ] `scripts/generate-templates-thumbnail.mjs` 内部パスimport廃止
4. [ ] playground ESLint設定維持（React/hooksルール）
5. [ ] playground Jest テストは Phase 1 では維持

## 1.8 CI/CD

```yaml
- run: npm ci
- run: npx oxlint .
- run: npx eslint --config eslint.typecheck.config.mjs .
- run: npm run typecheck
- run: npm run build
- run: npm run test
```

## 1.9 工数見積もり

| 作業 | 見積もり |
|------|---------|
| Phase 0: 互換性方針 + 事前準備 | 1日 |
| common + manipulator | 2日 |
| converter（pdfjs-dist v4含む）+ schemas | 3日 |
| generator | 1-2日 |
| ui | 2-3日 |
| pdf-lib（最大リスク） | 3-4日 |
| playground移行 + CI更新 | 2日 |
| **合計** | **14-17日** |

---

# Phase 2: @pdfme/cli（公開パッケージ、ESM-only）

## 2.1 コマンド一覧

| コマンド | 用途 |
|---------|------|
| `pdfme generate` | PDF生成 + 画像 + grid + diff |
| `pdfme validate` | テンプレート検証 |
| `pdfme inspect` | テンプレート構造表示 |
| `pdfme list-schemas` | スキーマ一覧 |
| `pdfme schema-info <type>` | スキーマ詳細情報（**新規**） |
| `pdfme template create` | 空テンプレート作成（**新規**） |
| `pdfme template add-field` | フィールド追加（**新規**） |
| `pdfme diff <dir1> <dir2>` | 独立画像差分比較（**新規**） |

## 2.2 CLIパーサー: citty

`node:util parseArgs` は使用しない（`strict:false` でオプション値消失バグ、boolean/optional value非対応）。

**citty**（UnJS製、ゼロ依存、サブコマンドネイティブ対応）を使用。

**`--grid` → `--grid` + `--grid-size` に分離:**
```
--grid           # boolean: グリッドを有効化
--grid-size <n>  # number: 格子間隔mm（デフォルト10）
```

**`--threshold` → `--max-diff` に変更（単位: 0-100%で統一）:**
```
--max-diff 10    # 10%以下のdiffを許容
```

## 2.3 generate コマンド

**mm→px変換（修正済み）:**
```typescript
import { ZOOM } from '@pdfme/common'; // 3.7795275591 = 96/25.4
const mmToPx = ZOOM * scale;
// ※ 前回の 2.835 は mm→pt 変換であり mm→px ではない
```

**canvas 遅延import:**
```typescript
async function loadImageTools() {
  try {
    const { pdf2img } = await import('@pdfme/converter');
    const canvas = await import('canvas');
    return { pdf2img, canvas };
  } catch {
    console.error(
      'Error: "canvas" package required for --image/--grid.\n' +
      'Install: npm install canvas\n' +
      'Linux: sudo apt-get install libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev librsvg2-dev'
    );
    process.exit(1);
  }
}
```

**--grid multi-input対応:**
```typescript
// inputs.length > 1 の場合の page index マッピング:
// output page = inputIndex * templatePages + templatePageIndex
const templatePages = template.schemas.length;
const templatePageIndex = outputPageIndex % templatePages;
const schemas = template.schemas[templatePageIndex];
// staticSchemaも描画対象に含める
const staticSchemas = isBlankPdf(template.basePdf) ? template.basePdf.staticSchema || [] : [];
```

**エラーメッセージに修正案:**
```
Error: Unknown type "textbox" in field "title". Did you mean: text?
Error: Font "Arial" not found. Available: NotoSerifJP-Regular. Use --font to load custom fonts.
Warning: Field "title" at (250,20) exceeds page width (210mm).
```

**--verbose, --batch, --open サポート**

## 2.4 template create + add-field（新規）

```bash
pdfme template create --size a4 -o template.json
pdfme template add-field -t template.json --name title --type text \
  --position 20,20 --size 170,15 --content "Invoice" --readonly \
  --prop fontSize=30 --prop alignment=center
```

実装: JSON操作のみ。各スキーマの `propPanel.defaultSchema` からデフォルト値取得。

## 2.5 schema-info（新規）

```bash
pdfme schema-info text --json
```

`getAllPlugins()` → `plugin.propPanel.defaultSchema` を読み取り表示。

## 2.6 package.json

```jsonc
{
  "name": "@pdfme/cli",
  "type": "module",
  "bin": { "pdfme": "dist/index.js" },
  "dependencies": {
    "@pdfme/common": "*", "@pdfme/schemas": "*",
    "@pdfme/generator": "*", "@pdfme/converter": "*",
    "citty": "^0.1.0", "pixelmatch": "^6.0.0", "pngjs": "^7.0.0"
  },
  "optionalDependencies": { "canvas": "^2.11.0" },
  "engines": { "node": ">=20" }
}
```

内部deps `"*"` はmonorepo convention。publish時に自動解決。npx対応のためregular deps。

## 2.7 validate仕様

- 同一ページ内のスキーマ名重複: ERROR
- 異なるページ間の同名: WARNING
- 位置のページ外はみ出し: WARNING

## 2.8 テスト

ESMでは `__dirname` 使用不可 → `fileURLToPath(import.meta.url)` 使用。
fonts.ts に `subset?: boolean` 追加。
stdin読み取りに3秒タイムアウト。

## 2.9 工数: 7-8日

---

# Phase 3: Claude Code Skills

## 3.1 スキル一覧

| スキル | 内容 |
|--------|------|
| `/pdfme-verify` | 変更検証（視覚品質基準付き） |
| `/pdfme-fix-rendering` | PDF描画デバッグ（**新規**） |
| `/pdfme-new-schema` | スキーマ雛形生成（自動検証付き） |
| `/pdfme-build` | スマートビルド |

## 3.2 `/pdfme-verify` 視覚品質基準

```
チェック基準:
a. テキストが読める（豆腐化なし）
b. テキストがバウンディングボックス内に収まっている
c. 画像が正しいアスペクト比
d. バーコード/QRコードが完全表示
e. テーブル罫線が揃っている
f. フィールド同士が意図せず重なっていない
```

## 3.3 `/pdfme-fix-rendering`（新規）

grid付き画像でフィールド位置を確認 → inspectで構造確認 → 修正 → 再生成で検証のワークフロー。

## 3.4 工数: 1日

---

# 全体スケジュール

| Phase | 工数 | 累計 |
|-------|------|------|
| 0: 互換性方針 | 1日 | 1日 |
| 1: Vite/Vitest/Oxlint | 14-17日 | 15-18日 |
| 2: @pdfme/cli | 7-8日 | 22-26日 |
| 3: Skills | 1日 | **23-27日** |

---

# 既知のリスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| pdf-lib Vite移行でPDF描画差異 | 高 | 最後に移行、image snapshot前後比較 |
| pdfjs-dist v4 API変更 | 高 | converter importパス事前調査 |
| vitest-image-snapshot API差異 | 高 | `imageMatcher()` + `toMatchImage()` |
| vite-plugin-dts モノレポ問題 | 高 | 使用せず `tsc --emitDeclarationOnly` |
| Oxlint型認識ルール非対応 | 中 | ESLint併用 |
| set-version.js CJS問題 | 中 | ESM書き換えまたは.cjsリネーム |
| canvas ビルド失敗 | 中 | optionalDeps + 遅延import |
| playground Vite 4互換性 | 中 | file:経由のため影響限定的 |

---

# 後続タスク（スコープ外）

- CLAUDE.md改善（地図化 + CLI使い方セクション）
- docs/ナレッジベース
- docs/schema-defaults.json（静的参照ファイル）
- Vite+統合CLI移行（安定版リリース後）
- カスタムプラグインCLI対応（`--plugins`）
