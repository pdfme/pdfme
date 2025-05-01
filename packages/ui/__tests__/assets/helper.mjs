import { jest } from '@jest/globals';
import { BLANK_PDF } from '@pdfme/common';

// Create mock for hooks
const mockUseUIPreProcessor = {
  backgrounds: ['data:image/png;base64,a...'],
  pageSizes: [{ height: 297, width: 210 }],
  scale: 1,
  error: null,
  refresh: () => Promise.resolve(),
};

// Setup mocks for UI tests
export const setupUIMock = () => {
  // Mock uuid function
  global.uuid = jest.fn()
    .mockReturnValueOnce('1')
    .mockReturnValueOnce('2')
    .mockReturnValueOnce('3')
    .mockReturnValueOnce('4')
    .mockReturnValueOnce('5');
  
  // Mock FontFace
  global.window.FontFace = jest.fn().mockReturnValue({ 
    load: () => Promise.resolve() 
  });
  
  // Setup mock for useUIPreProcessor
  global.mockUseUIPreProcessor = mockUseUIPreProcessor;
};

// Sample template for tests
export const getSampleTemplate = () => ({
  basePdf: BLANK_PDF,
  schemas: [
    [
      {
        name: 'field1',
        type: 'text',
        content: 'bb',
        position: { x: 20, y: 20 },
        width: 100,
        height: 15,
        alignment: 'left',
        fontSize: 30,
        characterSpacing: 0,
        lineHeight: 1,
      },
      {
        name: 'field2',
        type: 'image',
        content: 'aaaaaaaaaaaa',
        position: { x: 20, y: 35 },
        width: 100,
        height: 40,
      },
    ],
  ],
});
