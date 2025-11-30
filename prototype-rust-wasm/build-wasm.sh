#!/bin/bash

# Wasmビルドスクリプト
# wasm-pack が必要: cargo install wasm-pack

echo "Building Wasm package..."

# ブラウザターゲット
wasm-pack build --target web --out-dir pkg-web --release

# Node.jsターゲット
wasm-pack build --target nodejs --out-dir pkg-node --release

echo "Build complete!"
echo "Browser package: pkg-web/"
echo "Node.js package: pkg-node/"
echo ""
echo "File sizes:"
ls -lh pkg-web/*.wasm
ls -lh pkg-node/*.wasm
