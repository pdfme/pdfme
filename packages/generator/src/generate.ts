import { PDFDocument } from '@pdfme/pdf-lib';
import * as fontkit from 'fontkit';
import type { GenerateProps, Template, } from '@pdfme/common';
import { checkGenerateProps, } from '@pdfme/common';
import { renderInputByTemplateSchema } from './render';
import { drawEmbeddedPage, getEmbeddedPagesAndEmbedPdfBoxes, } from './pdfUtils'
import { TOOL_NAME } from './constants';

const preprocessing = async ({ template }: { template: Template; }) => {
  const { basePdf } = template;

  const pdfDoc = await PDFDocument.create();
  // @ts-ignore
  pdfDoc.registerFontkit(fontkit);

  const pagesAndBoxes = await getEmbeddedPagesAndEmbedPdfBoxes({ pdfDoc, basePdf });
  const { embeddedPages, embedPdfBoxes } = pagesAndBoxes;

  return { pdfDoc, embeddedPages, embedPdfBoxes };
};

const postProcessing = ({ pdfDoc }: { pdfDoc: PDFDocument }) => {
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

  const { pdfDoc, embeddedPages, embedPdfBoxes } = await preprocessing({ template });
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
        const schema = template.schemas[j];
        const templateSchema = schema[key];
        const input = inputObj[key];

        await renderInputByTemplateSchema({
          input,
          templateSchema,
          pdfDoc,
          page,
          options,
        });
      }
    }
  }

  postProcessing({ pdfDoc });

  return pdfDoc.save();
};

export default generate;
