import { uuid } from '../../../common/src/utils';
import * as hooks from '../../src/libs/hooks';
import { getPdfPageSizes, pdf2Pngs } from '../../src/libs/helper';
import { blankPdf } from '../../../common/src/';
import { Template } from '../../../common/src/type';

export const setupUIMock = () => {
  const backgrounds = ['data:image/png;base64,a...'];
  const pageSizes = [{ height: 297, width: 210 }];
  const mock = jest.spyOn(hooks, 'useUIPreProcessor');
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
  basePdf: blankPdf,
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
