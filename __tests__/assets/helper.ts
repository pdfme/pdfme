import { uuid } from '../../src/libs/utils';
import * as hooks from '../../src/libs/hooks';
import { getPdfPageSizes, pdf2Pngs } from '../../src/libs/pdfjs';
import { BLANK_PDF } from '../../src/libs/constants';
import { Template } from '../../src/libs/type';

export const setupUiMock = () => {
  const backgrounds = ['data:image/png;base64,a...'];
  const pageSizes = [{ height: 297, width: 210 }];
  const mock = jest.spyOn(hooks, 'useUiPreProcessor');
  mock.mockImplementation(() => ({ backgrounds, pageSizes, scale: 1, error: null }));
  (getPdfPageSizes as jest.Mock) = jest.fn().mockReturnValue(Promise.resolve(pageSizes));
  (pdf2Pngs as jest.Mock) = jest.fn().mockReturnValue(Promise.resolve(backgrounds));
  (uuid as jest.Mock) = jest
    .fn()
    .mockReturnValueOnce('1')
    .mockReturnValueOnce('2')
    .mockReturnValueOnce('3')
    .mockReturnValueOnce('4')
    .mockReturnValueOnce('5');
  const FontFace = jest.fn().mockReturnValue({ load: () => Promise.resolve() });
  global.window.FontFace = FontFace;
};

export const getSampleTemplate = (): Template => ({
  columns: ['field1', 'field2'],
  sampledata: [
    {
      field1: 'bb',
      field2: 'aaaaaaaaaaaa',
    },
  ],
  basePdf: BLANK_PDF,
  schemas: [
    {
      field1: {
        type: 'text',
        position: { x: 20, y: 20 },
        width: 100,
        height: 15,
        alignment: 'left',
        fontSize: 30,
        characterSpacing: 0,
        lineHeight: 1,
      },
      field2: {
        type: 'image',
        position: { x: 20, y: 35 },
        width: 100,
        height: 40,
      },
    },
  ],
});
