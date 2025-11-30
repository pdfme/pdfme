# Implementation Plan: PDFme Rust + Wasm

## Overview

This document outlines the detailed implementation plan for migrating PDFme's core functionality to Rust with WebAssembly support.

## Timeline: 6 Months

### Month 1-2: Core PDF Generation

#### Week 1-2: Foundation
- [x] Set up Rust project structure
- [x] Configure wasm-bindgen
- [x] Implement basic PDF document creation
- [x] Simple text rendering
- [ ] Font loading and management
- [ ] Font subsetting for size optimization

#### Week 3-4: Text Rendering
- [ ] Advanced text rendering
  - [ ] Multi-line text
  - [ ] Text alignment (left, center, right, justify)
  - [ ] Line height control
  - [ ] Letter spacing
  - [ ] Word wrapping
- [ ] Font features
  - [ ] Bold, italic, underline
  - [ ] Custom fonts (TTF, OTF)
  - [ ] CJK font support
  - [ ] Font fallback

#### Week 5-6: Graphics & Images
- [ ] Image embedding
  - [ ] JPEG support
  - [ ] PNG support (with transparency)
  - [ ] Image scaling and positioning
  - [ ] Image compression
- [ ] Basic graphics
  - [ ] Lines, rectangles, circles
  - [ ] Colors (RGB, RGBA, hex)
  - [ ] Border styles

#### Week 7-8: Template System
- [ ] Template parsing (JSON)
- [ ] Schema validation
- [ ] Position calculation
- [ ] Multi-page support
- [ ] Static schemas (headers/footers)

### Month 3: Schema Plugins

#### Week 9-10: Core Schemas
- [ ] Text schema (complete implementation)
  - [ ] All text options
  - [ ] Font customization
  - [ ] Dynamic content
- [ ] Image schema
  - [ ] Multiple image formats
  - [ ] Fit/contain modes
  - [ ] Rotation
- [ ] Line schema
  - [ ] Horizontal/vertical lines
  - [ ] Line styles (solid, dashed, dotted)

#### Week 11-12: Advanced Schemas
- [ ] Table schema
  - [ ] Rows and columns
  - [ ] Cell styling
  - [ ] Dynamic rows
  - [ ] Header/footer rows
- [ ] QR Code schema
  - [ ] QR code generation
  - [ ] Error correction levels
  - [ ] Size customization
- [ ] Barcode schema
  - [ ] Various barcode formats
  - [ ] Size and positioning

### Month 4: Dynamic Layout Engine

#### Week 13-14: Layout Calculations
- [ ] Dynamic height calculation
- [ ] Page break logic
- [ ] Content overflow handling
- [ ] Layout tree structure
- [ ] Dependency resolution

#### Week 15-16: Expression System
- [ ] Safe JavaScript expression parser
- [ ] Expression evaluation
- [ ] Variable substitution
- [ ] Caching mechanism
- [ ] Error handling

### Month 5: Multi-Platform Bindings

#### Week 17-18: Python Bindings
- [x] PyO3 integration
- [ ] Python API design
- [ ] Type conversions
- [ ] Error handling
- [ ] Documentation
- [ ] PyPI package
- [ ] Examples (Django, FastAPI, Flask)

#### Week 19-20: Node.js Optimization
- [x] Basic Wasm support
- [ ] napi-rs native module (optional)
- [ ] Performance comparison
- [ ] npm package
- [ ] TypeScript definitions
- [ ] Examples

### Month 6: Testing, Optimization & Documentation

#### Week 21-22: Testing
- [ ] Unit tests (Rust)
  - [ ] PDF structure tests
  - [ ] Rendering tests
  - [ ] Layout tests
- [ ] Integration tests
  - [ ] Cross-platform tests
  - [ ] Compatibility tests
- [ ] Visual regression tests
  - [ ] PDF snapshot comparison
  - [ ] Pixel-perfect validation

#### Week 23: Performance Optimization
- [ ] Profiling
  - [ ] Identify bottlenecks
  - [ ] Memory usage analysis
- [ ] Optimization
  - [ ] Hot path optimization
  - [ ] Memory pooling
  - [ ] Lazy loading
  - [ ] Parallel processing (where possible)
- [ ] Benchmarking
  - [ ] vs TypeScript version
  - [ ] Cross-platform comparison
  - [ ] Regression tests

#### Week 24: Documentation & Release
- [ ] API documentation
  - [ ] Rust docs
  - [ ] Browser API
  - [ ] Node.js API
  - [ ] Python API
- [ ] Migration guide
  - [ ] Breaking changes
  - [ ] Code examples
  - [ ] Gotchas
- [ ] Examples & tutorials
  - [ ] Basic usage
  - [ ] Advanced features
  - [ ] Real-world examples
- [ ] Release preparation
  - [ ] Package publishing
  - [ ] Announcement
  - [ ] Community outreach

## Technical Decisions

### PDF Library Choice

**Decision: Use `lopdf` + custom rendering**

Rationale:
- `lopdf`: Low-level PDF manipulation, full control
- `printpdf`: High-level API for drawing, but limited features
- Custom rendering: Maximum flexibility for PDFme's needs

Alternatives considered:
- Pure `printpdf`: Too limited for complex features
- Pure `lopdf`: Too low-level, more code required
- Fork pdf-lib to Rust: Too much work, hard to maintain

### Wasm Runtime for Other Languages

**Decision: Support both native bindings and Wasm**

- **Python**: PyO3 (native) primary, wasmtime (fallback)
- **Node.js**: Wasm primary, napi-rs (optional optimization)
- **Go**: wasmtime-go
- **Ruby**: wasmtime-rb

Rationale:
- Native bindings: Best performance
- Wasm: Universal compatibility, easier maintenance
- Users can choose based on their needs

### Expression System

**Decision: Implement in Rust using a safe parser**

Options:
1. Port to Rust directly ✅ **CHOSEN**
   - Full control over security
   - Better performance
   - No runtime dependency

2. Embed QuickJS (via Javy)
   - True JavaScript compatibility
   - Larger binary size
   - Performance overhead

Rationale:
- PDFme's expression system is simple enough to port
- Better security control
- Smaller binary size

## Success Criteria

### Performance
- [ ] 3x faster than TypeScript in browser
- [ ] 5x faster than TypeScript in Node.js
- [ ] Python performance acceptable (<2x slower than Node.js)

### Bundle Size
- [ ] Wasm binary < 300KB (gzipped)
- [ ] Total package size < 500KB
- [ ] 60%+ reduction from current size

### Compatibility
- [ ] 100% API compatibility with current TypeScript version
- [ ] All existing templates work without modification
- [ ] Pixel-perfect PDF output (compared to TS version)

### Cross-Platform
- [ ] Works in all major browsers
- [ ] Works in Node.js 16+
- [ ] Works in Python 3.7+
- [ ] Works in Go 1.18+

## Risk Mitigation

### Risk 1: Incomplete PDF Features
**Mitigation**:
- Start with MVP features
- Prioritize most-used schemas
- Gradual rollout

### Risk 2: Performance Not Meeting Expectations
**Mitigation**:
- Early benchmarking
- Profile-guided optimization
- Consider SIMD for hot paths

### Risk 3: Community Resistance
**Mitigation**:
- Clear communication
- Migration guide
- Parallel support for both versions
- Gather feedback early

### Risk 4: Rust Learning Curve
**Mitigation**:
- Document code thoroughly
- Provide contribution guide
- Mentor new contributors

### Risk 5: Wasm Compatibility Issues
**Mitigation**:
- Test on multiple platforms early
- Provide fallbacks
- Clear error messages

## Open Questions

1. **Plugin System**: How to support custom plugins?
   - Option A: Rust-only plugins (compile-time)
   - Option B: Wasm plugin system (runtime)
   - Option C: No custom plugins in Rust version

2. **UI Components**: Port @pdfme/ui to Rust?
   - Probably not - keep as React components
   - Communicate with Rust core via Wasm

3. **Backward Compatibility**: How strict?
   - 100% API compatibility?
   - Or allow minor breaking changes for better API?

4. **Release Strategy**: Big bang or gradual?
   - Separate package first (@pdfme/generator-wasm)
   - Then merge into main package

## Post-Release Roadmap

### v0.1.0 (Month 6)
- Core PDF generation
- Basic schemas (text, image)
- Browser + Node.js support

### v0.2.0 (Month 8)
- All schemas implemented
- Python support
- Dynamic layout engine

### v0.3.0 (Month 10)
- Performance optimizations
- Go support
- Feature parity with TypeScript version

### v1.0.0 (Month 12)
- Production-ready
- Full documentation
- Migration complete
- TypeScript version deprecated

## Conclusion

This is an ambitious but achievable plan. The key is to:

1. Start small with a working MVP
2. Iterate based on feedback
3. Maintain parallel support during transition
4. Communicate clearly with community

Success will transform PDFme into a truly multi-platform library, opening up new use cases and significantly improving performance.
