# ESMオンリー化とNode.js v20サポート移行計画

## 目標
- すべてのパッケージをESMオンリーの配信に変更
- Node.js v20以降のサポートに限定
- ビルドプロセスの簡素化と効率化
- メンテナンス性の向上

## タスク一覧

### 準備フェーズ
- [x] 現在の依存関係の分析と影響範囲の特定
- [x] 移行による破壊的変更の影響を評価
- [x] テスト環境のNode.js v20への更新
- [x] CIパイプラインのNode.js v20対応

### パッケージ設定の更新
各パッケージ（@pdfme/common, @pdfme/generator, @pdfme/schemas, @pdfme/converter, @pdfme/manipulator, @pdfme/ui）に対して：

- [x] package.jsonの更新
  - [x] "type": "module"の追加
  - [x] "engines": { "node": ">=20.0.0" }の追加
  - [x] exportsフィールドのESMオンリー化
  - [x] mainフィールドの削除
  - [x] 不要なビルドスクリプトの削除

- [x] tsconfig.jsonの更新
  - [x] targetを"ES2022"に設定
  - [x] moduleを"ESNext"に設定
  - [x] moduleResolutionを"bundler"に設定
  - [x] libの更新

### ビルドプロセスの簡素化
- [x] 各パッケージのビルドスクリプトの更新
  - [x] CJSビルドの削除
  - [x] ESMビルドのみに簡素化

### テストの更新
- [x] 各パッケージのテスト環境の更新
  - [x] Jest設定のESM対応
  - [x] jest-image-snapshotのカスタムマッチャー登録
  - [x] test-helpers.jsの整理
  - [x] テストが空のindex.test.tsの削除

### import拡張子修正フェーズ
- [x] 全パッケージの相対importに.js拡張子を付与し、ESMビルドエラーを解消する

### 各パッケージのビルド確認
- [x] @pdfme/common
- [x] @pdfme/schemas
- [x] @pdfme/generator
- [x] @pdfme/converter
- [x] @pdfme/manipulator
- [x] @pdfme/ui

### 残作業
- [x] テストが失敗する
  - [x] converter
  - [x] ui
- [x] playgroundでビルド確認 npm run dev でエラーになる。もはやpdf-lib自体をpdfmeの中に入れた方が今後のためにも楽かも
  - node_modules/@pdf-lib/upng/UPNG.js の末尾に export default UPNG; を追記する
  - node_modules/@pdfme/pdf-lib/es/utils/png.js を import _UPNG from '@pdf-lib/upng'; const UPNG = _UPNG.default; にする

### ドキュメントの更新
- [ ] READMEの更新
  - [ ] Node.js v20要件の明記
  - [ ] インストール手順の更新
  - [ ] 使用例の更新
- [ ] APIドキュメントの更新
- [ ] 移行ガイドの作成

### 検証フェーズ
- [ ] 各パッケージの動作確認
  - [ ] ビルドの成功確認
  - [ ] テストの成功確認
  - [ ] サンプルアプリケーションでの動作確認
- [ ] パフォーマンスの検証
- [ ] バンドルサイズの確認

### リリース準備
- [ ] バージョン番号の更新（メジャーバージョンアップ）
- [ ] 変更履歴の更新
- [ ] リリースノートの作成
- [ ] 移行ガイドの最終確認

## タイムライン
- 準備フェーズ: 1週間
- パッケージ設定の更新: 1週間
- ビルドプロセスの簡素化: 3日
- テストの更新: 1週間
- ドキュメントの更新: 3日
- 検証フェーズ: 1週間
- リリース準備: 2日

合計: 約5週間

## リスクと対策
1. 既存ユーザーへの影響
   - 対策: 十分な移行期間の確保と明確なドキュメントの提供

2. 依存パッケージの互換性
   - 対策: 事前の依存関係分析と必要に応じた代替手段の検討

3. ビルドプロセスの問題
   - 対策: 段階的な移行と各段階でのテスト実施

## 成功基準
1. すべてのパッケージがESMオンリーで正常に動作
2. Node.js v20での完全な互換性
3. ビルド時間の短縮
4. テストカバレッジの維持
5. ドキュメントの完全性

## フォローアップ
1. パフォーマンスモニタリング
2. ユーザーフィードバックの収集
3. 必要に応じた最適化の実施

# 進捗・現状まとめ（2024-05-21）

## 現状
- `test` コマンド：通る（テストは全てパス）
- `build` コマンド：通る
- `playground` ディレクトリで `npm run dev` を実行するとエラーが発生する
  - エラー内容：`pdfjsLib.GlobalWorkerOptions` が undefined になる、または `pdfjsLib.getDocument` が undefined になる等

## 検証フェーズまでの進捗
- 依存パッケージのインストール・importパス修正済み
- `pdfjs-dist` のESM/Node対応に伴うimport方法の修正済み
- テスト・ビルドは正常に完了する状態まで到達
- playgroundでの動作検証フェーズでエラーが発生しており、ここから先の対応が必要

---

今後のTODO（例）
- playgroundでの `npm run dev` エラーの根本解決
- `pdfjs-dist` のNode/ESM/ブラウザ環境ごとのimportやworker設定の整理
- 必要に応じてテスト用モックや環境分岐の導入