import { PDFDocument } from '@pdfme/pdf-lib';
import * as fontkit from 'fontkit';
import type {
  Font,
  GenerateProps,
  SchemaInputs,
  Template,
} from '@pdfme/common';
import {
  getDefaultFont,
  getFallbackFontName,
  checkGenerateProps,
} from '@pdfme/common';
import { renderInputByTemplateSchema } from './render';
import {
  drawEmbeddedPage,
  embedAndGetFontObj,
  getEmbeddedPagesAndEmbedPdfBoxes,
} from './pdfUtils'
import { TOOL_NAME } from './constants';
import type { InputImageCache } from "./types"

const preprocessing = async (arg: { inputs: SchemaInputs[]; template: Template; font: Font }) => {
  const { template, font } = arg;
  const { basePdf } = template;
  const fallbackFontName = getFallbackFontName(font);

  const pdfDoc = await PDFDocument.create();
  // @ts-ignore
  pdfDoc.registerFontkit(fontkit);

  const pdfFontObj = await embedAndGetFontObj({ pdfDoc, font });

  const pagesAndBoxes = await getEmbeddedPagesAndEmbedPdfBoxes({ pdfDoc, basePdf });
  const { embeddedPages, embedPdfBoxes } = pagesAndBoxes;

  return { pdfDoc, pdfFontObj, fallbackFontName, embeddedPages, embedPdfBoxes };
};

const postProcessing = (pdfDoc: PDFDocument) => {
  pdfDoc.setProducer(TOOL_NAME);
  pdfDoc.setCreator(TOOL_NAME);
};

const generate = async (props: GenerateProps) => {
  checkGenerateProps(props);
  const { inputs, template, options = {} } = props;
  // TODO  Implement the internal logic assuming that the following type of schema will be passed as an argument.
  // export const barcodeSchemaTypes = ['qrcode', 'japanpost', 'ean13', 'ean8', 'code39', 'code128', 'nw7', 'itf14', 'upca', 'upce', 'gs1datamatrix'] as const;
  // const notBarcodeSchemaTypes = ['text', 'image'] as const;
  /*
  const customSchemaForGenerator = {
    text: {
      renderer: ({ pdfDoc, page, schema, inputValue }) => {
        // TODO
      }
    },
    image: {
      renderer: ({ pdfDoc, page, schema, inputValue }) => {
        // TODO
      }
    }
    ...
  };
  */ 

  const { font = getDefaultFont() } = options;
  const { schemas } = template;

  const preRes = await preprocessing({ inputs, template, font });
  const { pdfDoc, pdfFontObj, fallbackFontName, embeddedPages, embedPdfBoxes } = preRes;

  const inputImageCache: InputImageCache = {};
  for (let i = 0; i < inputs.length; i += 1) {
    const inputObj = inputs[i];
    const keys = Object.keys(inputObj);
    for (let j = 0; j < embeddedPages.length; j += 1) {
      const embeddedPage = embeddedPages[j];
      const { width: pageWidth, height: pageHeight } = embeddedPage;
      const embedPdfBox = embedPdfBoxes[j];

      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      drawEmbeddedPage({ page, embeddedPage, embedPdfBox });
      for (let l = 0; l < keys.length; l += 1) {
        const key = keys[l];
        const schema = schemas[j];
        const templateSchema = schema[key];
        const input = inputObj[key];
        const fontSetting = { font, pdfFontObj, fallbackFontName };

        await renderInputByTemplateSchema({
          input,
          templateSchema,
          pdfDoc,
          page,
          fontSetting,
          inputImageCache,
        });
      }
    }
  }

  postProcessing(pdfDoc);

  return pdfDoc.save();
};

export default generate;
