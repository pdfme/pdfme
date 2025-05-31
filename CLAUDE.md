# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PDFme is a TypeScript-based PDF generation library that provides PDF creation from JSON templates, a visual template designer, and PDF manipulation tools. It works in both Node.js and browser environments.

## Monorepo Structure

This is a 6-package monorepo:

- **`@pdfme/common`** - Core types, constants, helpers, validation functions
- **`@pdfme/generator`** - PDF generation engine using pdf-lib
- **`@pdfme/schemas`** - Built-in field types (text, image, tables, barcodes, etc.)
- **`@pdfme/ui`** - React components (Designer, Form, Viewer)
- **`@pdfme/manipulator`** - PDF manipulation utilities (merge, split, rotate)
- **`@pdfme/converter`** - PDF conversion utilities (PDF to image, etc.)

## Development Commands

### Essential Commands
```bash
# Initial setup
npm install
npm run build

# Development workflow
npm run build           # Build all packages
npm run test           # Run tests for all packages
npm run lint           # Lint all packages
npm run clean          # Clean all dist folders

# Individual package development
cd packages/<package-name>
npm run dev            # Watch mode compilation
npm run build          # Production build
npm run test           # Run package tests
```

### Testing Changes
```bash
# Use playground for testing UI/integration changes
cd playground
npm install
npm run dev            # Starts development server at localhost:5173
npm run test           # Run E2E tests with Playwright
```

## Architecture Notes

- **Plugin System**: Extensible schema system for custom field types
- **Multi-environment Builds**: Each package generates CJS, ESM, and Node-specific builds
- **Dependency Chain**: Changes to `common` require rebuilding dependent packages
- **Template-based**: PDF generation uses JSON templates with dynamic data injection
- **Type Safety**: Comprehensive TypeScript throughout with strict configuration

## Key Files for Understanding

- `packages/common/src/types.ts` - Core type definitions
- `packages/generator/src/generate.ts` - Main PDF generation logic  
- `packages/ui/src/Designer.tsx` - Visual designer component
- `playground/` - Example usage and development testing

## Development Workflow

1. Make changes to relevant package(s)
2. Run `npm run build` from root to rebuild affected packages
3. Test changes in playground with `cd playground && npm run dev`
4. Run `npm run test` and `npm run lint` before committing
5. All packages must maintain browser and Node.js compatibility