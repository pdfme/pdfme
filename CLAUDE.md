# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PDFme is an open-source TypeScript-based PDF generation and manipulation library for web and Node.js applications. It provides a complete solution for creating, designing, and manipulating PDFs with a focus on performance, minimal dependencies, and ease of use.

## Claude Code Integration

### Triggering Claude Code
- Use `@claude` in GitHub issues, PR comments, or reviews to trigger Claude Code assistance
- Claude Code is configured via `.github/workflows/claude.yml` with appropriate permissions
- Best practices:
  - Be specific about the problem or task
  - Include relevant error messages or logs
  - Mention specific files or components when applicable

### GitHub Workflow Integration
- Claude Code automatically runs on issue comments, PR reviews, and new issues containing `@claude`
- Has read access to repository contents, pull requests, and issues
- Can assist with code analysis, debugging, and implementation suggestions

## Environment Requirements

### Node.js and Package Manager
- **Node.js**: Version 16 or higher (recommended: 18+ or 20+ for better performance)
- **npm**: Compatible with Node.js version (npm 8+ recommended)
- **Memory**: Minimum 4GB RAM, 8GB+ recommended for large PDF operations

### Required Development Tools
- **TypeScript**: For type checking and compilation
- **ESLint**: Code linting (configured in `eslint.config.mjs`)
- **Prettier**: Code formatting
- **Jest**: Testing framework with image snapshot support

### OS-Specific Considerations
- **Windows**: Use Git Bash or WSL for shell commands
- **macOS/Linux**: Standard terminal works fine
- **Memory limits**: Increase Node.js heap size for large PDFs: `node --max-old-space-size=8192`

## Common Development Commands

### Initial Setup and Build
```bash
npm install          # Install all dependencies
npm run build        # Build all packages in correct order
```

### Development Workflow
To work on packages with live reloading:
1. Run development mode in the packages you're working on:
   ```bash
   cd packages/[package-name] && npm run dev
   ```
2. Run the playground to test changes:
   ```bash
   cd playground && npm run dev  # Opens at localhost:5173
   ```

### Testing
```bash
npm run test                      # Run all tests
npm run test:ui:update-snapshots  # Update UI snapshot tests
# Run tests in specific package:
cd packages/[package-name] && npm run test
```

### Code Quality
```bash
npm run lint      # Run ESLint
npm run prettier  # Format code
```

### Building Individual Packages
```bash
npm run build:common      # Build @pdfme/common
npm run build:schemas     # Build @pdfme/schemas
npm run build:generator   # Build @pdfme/generator
npm run build:ui          # Build @pdfme/ui
```

## Architecture and Code Structure

### Monorepo Structure
- **packages/common**: Core types, utilities, and shared logic
- **packages/pdf-lib**: Forked pdf-lib with custom modifications
- **packages/schemas**: Built-in field types (text, image, table, barcode, etc.)
- **packages/generator**: PDF generation from templates
- **packages/ui**: React components (Designer, Form, Viewer)
- **packages/manipulator**: PDF operations (merge, split, rotate)
- **packages/converter**: Format conversion utilities
- **playground**: Interactive development and testing environment
- **website**: Documentation site (Docusaurus)

### Key Architectural Patterns

#### 1. Plugin-Based Field System
Each field type (text, image, table, etc.) is a plugin with three components:
- `pdf`: Renders in the PDF using pdf-lib
- `ui`: Renders interactively in the browser
- `propPanel`: Configuration UI for the Designer

Location: `packages/schemas/src/[field-type]/index.ts`

#### 2. Template Structure
Templates consist of:
- `basePdf`: Either blank PDF with dimensions or custom PDF file
- `schemas`: 2D array where each sub-array represents a page
- `staticSchemas`: Optional fields that appear on every page

Type definitions: `packages/common/src/types.ts`

#### 3. Dynamic Layout Engine
Handles:
- Dynamic height calculation for expandable fields
- Automatic page breaking
- Layout tree management

Key function: `packages/generator/src/dynamicTemplate.ts:getDynamicTemplate`

#### 4. UI Component Hierarchy
All UI components extend `BaseUIClass` and support three modes:
- `viewer`: Read-only display
- `form`: Interactive input
- `designer`: Template creation

Base class: `packages/ui/src/class.ts`

#### 5. Expression System
Secure JavaScript expression evaluator for dynamic content:
- Uses Acorn for parsing
- AST validation for security
- Cached compilation

Implementation: `packages/common/src/expression.ts`

### Important Implementation Details

1. **Build Order**: Due to dependencies, packages must be built in order:
   pdf-lib → common → converter → schemas → parallel(generator, ui, manipulator)

2. **Font Management**: Custom fonts are loaded and cached in the UI components and embedded with subsetting in PDFs

3. **Validation**: Uses Zod schemas for runtime validation throughout the codebase

4. **Caching**: Multiple caching layers for expressions, parsed data, and render-time optimization

5. **Cross-Platform**: Works in both Node.js and browser environments with different implementations

### Development Tips

1. **Testing Changes**: Always test in the playground after making changes
2. **Type Safety**: Leverage TypeScript - check type definitions in `packages/common/src/types.ts`
3. **Plugin Development**: Follow existing schema patterns in `packages/schemas/src/`
4. **UI Changes**: May take 5-10 seconds to reflect in playground due to build process
5. **Snapshot Tests**: Update snapshots when UI changes are intentional
6. **Hot Reload Setup**: Run `npm run dev` in multiple packages simultaneously for efficient development
7. **Playground Testing**: Use `cd playground && npm run dev` to test changes in real-time
8. **Memory Management**: Monitor memory usage when working with large PDFs or multiple templates

## Contribution Guidelines

### Pull Request Workflow
1. **Branch Naming**: Use format `feature/description` or `fix/description`
2. **Base Branch**: Always create PRs against `main` branch
3. **Testing Requirements**: 
   - Run `npm run test` and ensure all tests pass
   - Run `npm run lint` and fix any linting issues
   - Update snapshots if UI changes are intentional: `npm run test:ui:update-snapshots`

### Code Standards
- **TypeScript**: All new code must be written in TypeScript
- **ESLint**: Follow existing ESLint configuration
- **Prettier**: Format code using `npm run prettier`
- **Type Safety**: Ensure proper type definitions and avoid `any` types

### Commit Message Standards
- Use conventional commit format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Examples:
  - `feat(generator): add support for dynamic page breaks`
  - `fix(ui): resolve Designer canvas rendering issue`
  - `docs(readme): update installation instructions`

### Code Review Process
- All PRs require review before merging
- Address reviewer feedback promptly
- Ensure CI checks pass before requesting review
- Keep PRs focused and reasonably sized

## Performance Optimization

### Memory Management for Large PDFs
- **Heap Size**: Increase Node.js heap size for large operations:
  ```bash
  node --max-old-space-size=8192 your-script.js
  ```
- **Streaming**: Use streaming approaches for very large PDFs when possible
- **Cleanup**: Properly dispose of PDF documents and clear caches

### Rendering Optimization
- **Lazy Loading**: Implement lazy loading for large template lists
- **Caching**: Leverage built-in caching for expressions and parsed data
- **Batch Operations**: Process multiple PDFs in batches rather than individually
- **Font Subsetting**: Use font subsetting to reduce PDF file sizes

### Bundle Size Optimization
- **Tree Shaking**: Ensure proper tree shaking in webpack configurations
- **Dynamic Imports**: Use dynamic imports for large dependencies
- **Package Analysis**: Regularly analyze bundle sizes with tools like webpack-bundle-analyzer

### Browser vs Node.js Performance
- **Browser**: Limited by available memory and processing power
- **Node.js**: Can handle larger operations but watch for memory leaks
- **Worker Threads**: Consider worker threads for CPU-intensive operations in Node.js

## Troubleshooting

### Build Errors

#### TypeScript Compilation Issues
```bash
# Clear TypeScript cache
rm -rf packages/*/dist packages/*/.tsbuildinfo
npm run build
```

#### Webpack/Bundling Problems
```bash
# Clear node_modules and reinstall
rm -rf node_modules packages/*/node_modules
npm install
npm run build
```

#### Dependency Resolution Issues
```bash
# Check for version conflicts
npm ls
# Fix peer dependency warnings
npm install --legacy-peer-deps
```

### Type Errors

#### Missing Type Definitions
- Check `packages/common/src/types.ts` for core type definitions
- Ensure proper imports: `import type { Template } from '@pdfme/common'`
- Update type definitions when adding new features

#### Import Resolution Problems
```bash
# Rebuild packages in correct order
npm run build:common
npm run build:schemas
npm run build:generator
npm run build:ui
```

### Environment Issues

#### Node Version Conflicts
```bash
# Check Node version
node --version
# Use nvm to switch versions
nvm use 18
```

#### Package Manager Issues
```bash
# Clear npm cache
npm cache clean --force
# Remove package-lock.json and reinstall
rm package-lock.json
npm install
```

### Memory Issues

#### Large PDF Processing
```bash
# Increase heap size
export NODE_OPTIONS="--max-old-space-size=8192"
npm run dev
```

#### Memory Leaks in Development
- Restart development servers regularly
- Monitor memory usage in browser dev tools
- Clear caches periodically

### Font Issues

#### Font Loading Failures
- Ensure fonts are properly embedded in PDFs
- Check font file paths and accessibility
- Verify font format compatibility (TTF, OTF)

#### CJK Font Problems
- Use the forked `@pdfme/pdf-lib` which includes CJK support
- Ensure proper font subsetting for large character sets
- Test with actual CJK content

### Dependency Conflicts

#### Package Version Mismatches
```bash
# Check for outdated packages
npm outdated
# Update specific packages
npm update @pdfme/common @pdfme/generator
```

#### Peer Dependency Issues
```bash
# Install with legacy peer deps
npm install --legacy-peer-deps
# Or fix peer dependencies manually
npm install <missing-peer-dependency>
```

## Common Error Patterns

### Font-Related Errors
- **Error**: `Font not found` or `Invalid font`
- **Solution**: Verify font file exists and is accessible, check font embedding settings
- **Prevention**: Test with standard fonts first, then add custom fonts

### Memory Allocation Errors
- **Error**: `JavaScript heap out of memory`
- **Solution**: Increase heap size with `--max-old-space-size=8192`
- **Prevention**: Process large PDFs in smaller chunks, implement proper cleanup

### Import/Export Resolution Issues
- **Error**: `Module not found` or `Cannot resolve module`
- **Solution**: Check build order, ensure packages are built before importing
- **Prevention**: Follow proper build sequence, use TypeScript path mapping

### Plugin Development Pitfalls
- **Error**: Plugin not rendering correctly
- **Solution**: Ensure plugin exports `{ ui, pdf, propPanel }` correctly
- **Prevention**: Follow existing plugin patterns in `packages/schemas/src/`

### Playground Connection Issues
- **Error**: Changes not reflecting in playground
- **Solution**: Restart development servers, check if packages are in dev mode
- **Prevention**: Ensure proper hot reload setup across packages

## Enhanced Development Workflow

### Hot Reload Setup
1. **Start package development servers**:
   ```bash
   # Terminal 1
   cd packages/common && npm run dev
   
   # Terminal 2  
   cd packages/schemas && npm run dev
   
   # Terminal 3
   cd packages/generator && npm run dev
   
   # Terminal 4
   cd packages/ui && npm run dev
   ```

2. **Start playground**:
   ```bash
   # Terminal 5
   cd playground && npm run dev
   ```

### E2E Testing Procedures
```bash
# Run full test suite
npm run test

# Run playground E2E tests
cd playground && npm run test

# Update UI snapshots after intentional changes
npm run test:ui:update-snapshots
```

### Debugging with Playground
- Use playground for rapid prototyping and testing
- Add console.log statements for debugging
- Test with various template configurations
- Verify changes across different browsers

### CI/CD Integration
- All PRs automatically run tests via GitHub Actions
- Ensure local tests pass before pushing
- Monitor CI status and address failures promptly
- Use Claude Code integration for assistance with CI issues

### Key Files to Understand

- `packages/common/src/types.ts`: Core type definitions
- `packages/generator/src/generate.ts`: Main PDF generation logic
- `packages/ui/src/components/Designer/index.tsx`: Designer implementation
- `packages/schemas/src/text/index.ts`: Example of a complete plugin
- `playground/public/template-assets/`: Template examples and definitions
