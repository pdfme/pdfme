# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PDFme is an open-source TypeScript-based PDF generation and manipulation library for web and Node.js applications. It provides a complete solution for creating, designing, and manipulating PDFs with a focus on performance, minimal dependencies, and ease of use.

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

### Key Files to Understand

- `packages/common/src/types.ts`: Core type definitions
- `packages/generator/src/generate.ts`: Main PDF generation logic
- `packages/ui/src/components/Designer/index.tsx`: Designer implementation
- `packages/schemas/src/text/index.ts`: Example of a complete plugin
- `playground/public/template-assets/`: Template examples and definitions