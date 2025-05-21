// Jest setup file to mock pdfjs-dist worker entry
jest.mock('pdfjs-dist/build/pdf.worker.entry.js', () => ''); 