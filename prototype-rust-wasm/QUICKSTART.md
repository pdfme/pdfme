# 🚀 Quick Start Guide

Get up and running with the PDFme Rust + Wasm prototype in 5 minutes!

## Prerequisites

- **Rust**: [Install from rustup.rs](https://rustup.rs/)
- **wasm-pack**: `cargo install wasm-pack`
- **Python 3.7+** (optional, for Python demos)
- **Node.js 16+** (optional, for Node.js demos)

## 1. Build the Project

### Option A: Using Make (Recommended)

```bash
# Build WebAssembly modules
make build-wasm

# Build Python module (optional)
make build-python
```

### Option B: Manual Build

```bash
# Build for browser
wasm-pack build --target web --out-dir pkg-web --release

# Build for Node.js
wasm-pack build --target nodejs --out-dir pkg-node --release

# Build for Python
cd python-binding
maturin develop --release
```

## 2. Try the Demos

### Browser Demo

```bash
# Start a local server
python3 -m http.server 8000

# Open in browser
# http://localhost:8000/demo-browser.html
```

### Node.js Demo

```bash
node demo-node.js
```

Output:
```
🦀 PDFme Rust + Wasm - Node.js Demo
✅ PDF saved to: output-node.pdf
📦 PDF size: 2.34 KB
⚡ Benchmark Results (100 iterations):
   Average: 1.23ms
   ...
```

### Python Demo

```bash
cd python-binding
python3 demo.py
```

Output:
```
🦀 PDFme Rust + Python Demo
✅ PDF saved to: output-python.pdf
📦 PDF size: 2.34 KB
⏱️  Generation time: 0.89ms
...
```

## 3. Use in Your Code

### Browser (ES Modules)

```html
<script type="module">
  import init, { generate } from './pkg-web/pdfme_core.js';

  await init();

  const template = {
    basePdf: { width: 210, height: 297 },
    schemas: [[
      {
        name: "name",
        type: "text",
        position: { x: 20, y: 20 },
        width: 100,
        height: 10
      }
    ]]
  };

  const inputs = [{ name: "John Doe" }];

  const pdfBytes = generate(
    JSON.stringify(template),
    JSON.stringify(inputs)
  );

  // Create download link
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'output.pdf';
  a.click();
</script>
```

### Node.js (CommonJS)

```javascript
const { generate } = require('./pkg-node/pdfme_core.js');
const fs = require('fs');

const template = {
  basePdf: { width: 210, height: 297 },
  schemas: [[
    {
      name: "name",
      type: "text",
      position: { x: 20, y: 20 },
      width: 100,
      height: 10
    }
  ]]
};

const inputs = [{ name: "John Doe" }];

const pdfBytes = generate(
  JSON.stringify(template),
  JSON.stringify(inputs)
);

fs.writeFileSync('output.pdf', Buffer.from(pdfBytes));
console.log('PDF generated!');
```

### Python

```python
import pdfme

template = {
    "basePdf": {"width": 210, "height": 297},
    "schemas": [[
        {
            "name": "name",
            "type": "text",
            "position": {"x": 20, "y": 20},
            "width": 100,
            "height": 10
        }
    ]]
}

inputs = [{"name": "John Doe"}]

pdf_bytes = pdfme.generate(template, inputs)

with open("output.pdf", "wb") as f:
    f.write(pdf_bytes)

print("PDF generated!")
```

## 4. Next Steps

- Read the full [README.md](README.md)
- Check out the [Implementation Plan](IMPLEMENTATION_PLAN.md)
- Review the [Wasm Strategy](../docs/WASM_STRATEGY.md)
- Try modifying the templates
- Run benchmarks

## Troubleshooting

### Wasm build fails

```bash
# Make sure you have the wasm32 target
rustup target add wasm32-unknown-unknown

# Try cleaning and rebuilding
make clean
make build-wasm
```

### Python build fails

```bash
# Install build dependencies
pip install maturin

# Try in development mode
cd python-binding
maturin develop
```

### Node.js demo doesn't work

```bash
# Make sure you built for Node.js target
wasm-pack build --target nodejs --out-dir pkg-node --release

# Check Node.js version (requires 16+)
node --version
```

## Getting Help

- Check the [README.md](README.md) for detailed documentation
- Review error messages carefully
- Make sure all prerequisites are installed
- Try cleaning and rebuilding: `make clean && make build-wasm`

---

Happy coding! 🦀✨
