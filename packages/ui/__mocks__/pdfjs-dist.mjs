import { jest } from '@jest/globals';
import { BLANK_PDF } from '@pdfme/common';

// Mock PDF.js library
export const getDocument = jest.fn().mockImplementation(() => {
  return {
    promise: Promise.resolve({
      numPages: 1,
      getPage: jest.fn().mockImplementation(() => {
        return Promise.resolve({
          getViewport: jest.fn().mockReturnValue({
            width: 793.7,
            height: 1122.5,
            scale: 1
          }),
          render: jest.fn().mockReturnValue(Promise.resolve())
        });
      })
    })
  };
});

// Mock version 5.x specific APIs
export const version = '5.2.133';

export const GlobalWorkerOptions = {
  workerSrc: ''
};

// Mock PDFDataRangeTransport for version 5.x
export class PDFDataRangeTransport {}

// Mock PDFDocumentLoadingTask for version 5.x
export class PDFDocumentLoadingTask {}

// Export as both named exports and default export
const pdfjsLib = {
  getDocument,
  GlobalWorkerOptions,
  version,
  PDFDataRangeTransport,
  PDFDocumentLoadingTask
};

export default pdfjsLib;
