# PDFme Technical Context

## Technologies Used

- **Language**: TypeScript
- **Framework**: React (UI components)
- **Build Tools**: npm scripts, webpack
- **Testing**: Jest
- **Documentation**: Docusaurus
- **Dependent Libraries**:
  - pdf-lib (forked): PDF generation
  - fontkit: Font rendering
  - PDF.js: PDF viewing
  - antd: UI components
  - react-moveable, react-selecto: Designer UI
  - dnd-kit: Drag & drop functionality

## Development Setup

1. Clone the repository
2. Install dependencies with `npm install`
3. Build packages with `npm run build`
4. Run tests with `npm run test`
5. Start development mode with `npm run dev` in each package
6. Test changes in playground: `cd playground && npm install && npm run dev`

## Technical Constraints

- Requires Node.js 16 or higher
- Must work in both browser and Node.js environments
- Maintain minimal dependencies
- Prioritize performance
- Maintain backward compatibility

## Dependency Management

- Carefully consider adding new dependencies
- Consolidate common functionality in @pdfme/common
- Each package has clearly separated responsibilities
