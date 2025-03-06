# PDFme System Patterns

## Architecture Overview

PDFme adopts a modularized package structure:

```
pdfme/
├── packages/
│   ├── common/       # Common type definitions and utilities
│   ├── generator/    # PDF generation engine
│   ├── schemas/      # Template schema definitions
│   ├── ui/           # React-based designer and viewer
│   ├── manipulator/  # PDF manipulation tools
│   └── converter/    # PDF conversion utilities
├── website/          # Documentation site
└── playground/       # Development test environment
```

## Key Technical Decisions

1. **Monorepo Structure**: Manage all packages in a single repository for consistent development and releases

2. **Package Separation**: Separated packages by functionality allowing import of only needed features

3. **pdf-lib Fork**: Forked and extended pdf-lib for CJK font and SVG support

4. **TypeScript Adoption**: For type safety and improved code quality

## Design Patterns

1. **Factory Pattern**: Abstraction for templates and PDF generation

2. **Adapter Pattern**: Ensuring compatibility between different environments (browser/Node.js)

3. **Composite Pattern**: Building complex PDF document structures

4. **Observer Pattern**: State change notifications in UI components
