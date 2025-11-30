.PHONY: help install build-wasm build-python test clean demo

help:
	@echo "🦀 PDFme Rust + Wasm Prototype"
	@echo ""
	@echo "Available commands:"
	@echo "  make install      - Install required tools"
	@echo "  make build-wasm   - Build WebAssembly modules"
	@echo "  make build-python - Build Python module"
	@echo "  make test         - Run tests"
	@echo "  make demo         - Run all demos"
	@echo "  make clean        - Clean build artifacts"
	@echo ""

install:
	@echo "📦 Installing required tools..."
	@command -v rustc >/dev/null 2>&1 || { echo "Installing Rust..."; curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh; }
	@command -v wasm-pack >/dev/null 2>&1 || { echo "Installing wasm-pack..."; cargo install wasm-pack; }
	@command -v maturin >/dev/null 2>&1 || { echo "Installing maturin..."; pip install maturin; }
	@echo "✅ All tools installed!"

build-wasm:
	@echo "🔨 Building WebAssembly modules..."
	@echo "Building for browser..."
	wasm-pack build --target web --out-dir pkg-web --release
	@echo "Building for Node.js..."
	wasm-pack build --target nodejs --out-dir pkg-node --release
	@echo "✅ Wasm build complete!"
	@echo ""
	@echo "📊 Build sizes:"
	@ls -lh pkg-web/*.wasm 2>/dev/null || true
	@ls -lh pkg-node/*.wasm 2>/dev/null || true

build-python:
	@echo "🐍 Building Python module..."
	cd python-binding && maturin develop --release
	@echo "✅ Python build complete!"

test:
	@echo "🧪 Running tests..."
	cargo test
	@echo "✅ Tests passed!"

demo: build-wasm
	@echo "🎬 Running demos..."
	@echo ""
	@echo "1️⃣  Browser demo:"
	@echo "   Open demo-browser.html in your browser"
	@echo "   Or run: python3 -m http.server 8000"
	@echo ""
	@echo "2️⃣  Node.js demo:"
	@node demo-node.js 2>/dev/null || echo "   Run: node demo-node.js"
	@echo ""
	@echo "3️⃣  Python demo:"
	@echo "   First run: make build-python"
	@echo "   Then run: cd python-binding && python3 demo.py"

clean:
	@echo "🧹 Cleaning build artifacts..."
	cargo clean
	rm -rf pkg pkg-web pkg-node
	rm -rf target
	rm -rf python-binding/target
	rm -rf python-binding/dist
	rm -f *.pdf
	rm -f python-binding/*.pdf
	@echo "✅ Clean complete!"

.DEFAULT_GOAL := help
