# PDFme Project Overview

PDFme is a TypeScript-based library designed to simplify the PDF design and generation process. It is distributed as multiple npm packages and works in both browser and Node.js environments.

## Main Objectives

- Create designed PDFs with simple code
- Integrate PDF editor features into applications
- Create large numbers of PDFs without compromising performance

## Technology Stack

- TypeScript: All codebase
- React: UI components
- pdf-lib (forked version): PDF generation engine
- Others: fontkit, PDF.js, antd, react-moveable, react-selecto, dnd-kit

## Repository Structure

- **packages/**: Main libraries
  - **@pdfme/generator, @pdfme/schemas, @pdfme/ui**: PDF generation and template design
  - **@pdfme/manipulator, @pdfme/converter**: PDF manipulation utilities
  - **@pdfme/common**: Common logic and type definitions
- **website/**: Official documentation (Docusaurus)
- **playground/**: React SPA for development testing

## License and Contributions

- Open source under MIT license
- Community development and contributions welcome
