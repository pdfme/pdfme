import { Template } from '../../../src/index';
import { examplePdfb64, dogPngb64 } from './sampleData';

export const getTemplate = (): Template => ({
  basePdf: examplePdfb64,
  schemas: [
    {
      name: {
        type: 'text',
        position: {
          x: 25.06,
          y: 26.35,
        },
        width: 77.77,
        height: 18.7,
        fontSize: 36,
        fontColor: '#14b351',
      },

      photo: {
        type: 'image',
        position: {
          x: 24.99,
          y: 65.61,
        },
        width: 60.66,
        height: 93.78,
      },
      age: {
        type: 'text',
        position: {
          x: 36,
          y: 179.46,
        },
        width: 43.38,
        height: 6.12,
        fontSize: 12,
      },
      sex: {
        type: 'text',
        position: {
          x: 36,
          y: 186.23,
        },
        width: 43.38,
        height: 6.12,
        fontSize: 12,
      },
      weight: {
        type: 'text',
        position: {
          x: 40,
          y: 192.99,
        },
        width: 43.38,
        height: 6.12,
        fontSize: 12,
      },
      breed: {
        type: 'text',
        position: {
          x: 40,
          y: 199.09,
        },
        width: 43.38,
        height: 6.12,
        fontSize: 12,
      },
      owner: {
        type: 'qrcode',
        position: {
          x: 115.09,
          y: 204.43,
        },
        width: 26.53,
        height: 26.53,
      },
    },
  ],
  sampledata: [
    {
      name: 'Pet Name',
      photo: dogPngb64,
      age: '4 years',
      sex: 'Male',
      weight: '33 pounds',
      breed: 'Mutt',
      owner: 'https://pdfme.com/',
    },
  ],
  columns: ['name', 'photo', 'age', 'sex', 'weight', 'breed', 'owner'],
});
