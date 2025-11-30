# PDFme Rust + Wasm 実装戦略

## 概要

pdf-libとgeneratorをRustで再実装し、Wasmとしてコンパイルすることで、
JavaScriptランタイムなしで、あらゆる言語・環境でPDF生成を可能にする。

## アーキテクチャ

### コア実装 (Rust)

```
pdfme-core/
├── Cargo.toml
├── src/
│   ├── lib.rs              # メインエントリポイント
│   ├── pdf/                # pdf-lib相当
│   │   ├── document.rs     # PDFDocument
│   │   ├── page.rs         # PDFPage
│   │   ├── graphics.rs     # 描画API
│   │   ├── text.rs         # テキストレンダリング
│   │   └── fonts.rs        # フォント管理
│   ├── generator/          # @pdfme/generator相当
│   │   ├── template.rs     # テンプレート処理
│   │   ├── layout.rs       # 動的レイアウト
│   │   └── render.rs       # レンダリングエンジン
│   └── schemas/            # @pdfme/schemas相当
│       ├── text.rs
│       ├── image.rs
│       ├── table.rs
│       └── qrcode.rs
└── bindings/
    ├── wasm/               # wasm-bindgen
    ├── node/               # napi-rs
    └── python/             # PyO3
```

## 各プラットフォームでの利用方法

### 1. ブラウザ (WebAssembly)

```typescript
// wasm-pack でビルド
import init, { generate } from 'pdfme-wasm';

await init();
const pdfBytes = generate({
  template: { ... },
  inputs: [{ ... }]
});

// Blobとしてダウンロード
const blob = new Blob([pdfBytes], { type: 'application/pdf' });
```

**特徴**:
- JSランタイム不要
- ネイティブ並みのパフォーマンス
- サンドボックス化（セキュア）
- ファイルサイズ: 数百KB（gzip後）

### 2. Node.js

#### Option A: Wasm経由
```javascript
const { generate } = require('pdfme-wasm');

const pdf = await generate(template, inputs);
fs.writeFileSync('output.pdf', pdf);
```

#### Option B: Native Module (napi-rs)
```javascript
// より高速、Node.js専用
const { generate } = require('pdfme-native');

const pdf = await generate(template, inputs);
```

**特徴**:
- 現在のTSバージョンより高速
- メモリ効率が良い
- バイナリサイズが小さい

### 3. Python

#### Option A: PyO3 (Native Extension)
```python
import pdfme

pdf_bytes = pdfme.generate(
    template={...},
    inputs=[{...}]
)

with open('output.pdf', 'wb') as f:
    f.write(pdf_bytes)
```

#### Option B: Wasmtime経由
```python
from wasmtime import Store, Module, Instance
import pdfme_wasm

pdf = pdfme_wasm.generate(template, inputs)
```

**特徴**:
- `pip install pdfme` だけで使える
- 追加のランタイム不要
- Django、FastAPIなどで直接使用可能

### 4. Go

```go
package main

import (
    "github.com/tetratelabs/wazero"
    "github.com/pdfme/pdfme-go"
)

func main() {
    pdf, err := pdfme.Generate(template, inputs)
    if err != nil {
        panic(err)
    }
    os.WriteFile("output.pdf", pdf, 0644)
}
```

### 5. その他の言語

Wasmランタイムを持つ言語なら全て対応可能:
- **Ruby**: wasmtime-rb
- **PHP**: wasm-php
- **C#**: wasmtime-dotnet
- **Java**: wasmtime-java

## 実装ステップ

### Phase 1: MVP (1-2ヶ月)
- [ ] Rust基本構造の構築
- [ ] PDFDocument基本API
- [ ] シンプルなテキストレンダリング
- [ ] Wasmビルドパイプライン
- [ ] ブラウザデモ

### Phase 2: Core機能 (2-3ヶ月)
- [ ] 全pdf-lib APIの移植
- [ ] フォント埋め込み（サブセット化）
- [ ] 画像埋め込み（JPEG、PNG）
- [ ] テンプレートエンジン
- [ ] 動的レイアウト

### Phase 3: Schemas (1-2ヶ月)
- [ ] text schema
- [ ] image schema
- [ ] table schema
- [ ] qrcode schema
- [ ] その他のschemas

### Phase 4: 多言語バインディング (1ヶ月)
- [ ] Python (PyO3)
- [ ] Node.js (napi-rs)
- [ ] Go bindings
- [ ] ドキュメント整備

### Phase 5: 最適化 & 安定化 (継続)
- [ ] パフォーマンスチューニング
- [ ] メモリ最適化
- [ ] エラーハンドリング改善
- [ ] テストカバレッジ100%

## 技術スタック

### Rustクレート
- **lopdf**: PDFの低レベル操作
- **printpdf**: PDF生成（参考実装）
- **rusttype** / **ab_glyph**: フォントレンダリング
- **image**: 画像処理
- **serde**: シリアライゼーション

### ビルドツール
- **wasm-pack**: Wasmビルド
- **napi-rs**: Node.jsバインディング
- **PyO3**: Pythonバインディング
- **maturin**: Pythonパッケージング

### テスト
- **wasm-bindgen-test**: Wasmテスト
- **criterion**: ベンチマーク
- **insta**: スナップショットテスト

## パフォーマンス比較（予想）

| 環境 | 現在 (TS/JS) | Wasm版 | 改善率 |
|------|--------------|--------|--------|
| ブラウザ | 1.0x | 3-5x | 300-500% |
| Node.js | 1.0x | 5-10x | 500-1000% |
| Python | - | - | 新規対応 |

## ファイルサイズ比較（予想）

| パッケージ | 現在 (JS) | Wasm版 |
|-----------|-----------|--------|
| @pdfme/generator | ~500KB | ~200KB (gzip) |
| @pdfme/pdf-lib | ~300KB | 含む |
| 合計 | ~800KB | ~200KB |

## メリット

### 開発者体験
✅ 1つのコードベースで全プラットフォーム対応
✅ 型安全性（Rustの強力な型システム）
✅ パッケージマネージャーでインストール可能
✅ ランタイム不要（Pythonなど）

### パフォーマンス
✅ 3-10倍の高速化
✅ メモリ使用量削減
✅ バイナリサイズ削減
✅ 起動時間の短縮

### セキュリティ
✅ メモリ安全性（Rust）
✅ Wasmサンドボックス
✅ 依存関係の削減

### 保守性
✅ JSの依存関係地獄からの解放
✅ コンパイル時エラー検出
✅ リファクタリングが容易

## デメリット

### 開発コスト
❌ 初期実装に3-6ヶ月
❌ Rustの学習コスト
❌ 既存機能の完全移植が必要

### 互換性
❌ 既存のJSプラグインが使えない
❌ 移行期間が必要
❌ ブレーキングチェンジ

### エコシステム
❌ RustのPDFライブラリは成熟度が低い
❌ デバッグがJSより難しい

## 移行戦略

### ハイブリッドアプローチ

**Phase 1**: Wasmを並行提供
```javascript
// 既存のJS版
import { generate } from '@pdfme/generator';

// 新しいWasm版（オプトイン）
import { generate } from '@pdfme/generator-wasm';
```

**Phase 2**: デフォルトをWasmに
```javascript
// 自動的にWasmを使用（フォールバックあり）
import { generate } from '@pdfme/generator'; // uses wasm
import { generate } from '@pdfme/generator-js'; // legacy
```

**Phase 3**: JS版の廃止
```javascript
// Wasmのみ
import { generate } from '@pdfme/generator';
```

## プロトタイプ

最小限の機能を持つプロトタイプを作成して検証：

### 範囲
- 空白PDFの生成
- テキスト描画（1フォントのみ）
- 簡単なテンプレート処理
- ブラウザとNode.jsで動作

### 成功基準
- Wasmファイルサイズ < 500KB
- ベンチマーク: JS版の2倍以上高速
- メモリ使用量: JS版の50%以下

### タイムライン
- Week 1: Rust基本実装
- Week 2: Wasmビルド＆統合
- Week 3: ベンチマーク＆最適化
- Week 4: ドキュメント＆デモ

## 参考プロジェクト

### 成功例
- **typst**: Rust製組版システム（Wasm対応）
  - https://github.com/typst/typst
- **swc**: Rust製JSコンパイラ（Babel代替）
  - https://swc.rs
- **deno**: Rust + V8（Node.js代替）
  - https://deno.land
- **parcel**: Rust書き直しで10x高速化
  - https://parceljs.org

### Rust PDFライブラリ
- **lopdf**: 低レベルPDF操作
  - https://github.com/J-F-Liu/lopdf
- **printpdf**: PDF生成
  - https://github.com/fschutt/printpdf
- **pdf-canvas**: グラフィックAPI
  - https://github.com/kaj/rust-pdf

## 次のステップ

1. **プロトタイプ作成**: 最小限のPDF生成をRust + Wasmで実装
2. **ベンチマーク**: パフォーマンスを測定
3. **フィードバック**: コミュニティに提案
4. **本実装**: 成功したらフル実装開始

## まとめ

Rust + Wasmによる再実装は、pdfmeを**真のマルチプラットフォームライブラリ**に進化させる大きな機会です。

初期コストは高いですが、長期的には：
- ✅ パフォーマンス向上
- ✅ 多言語対応
- ✅ 保守性向上
- ✅ セキュリティ向上

というメリットがあります。

**まずはプロトタイプから始めることをお勧めします。**
