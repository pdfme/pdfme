import * as pdfLib from '@pdfme/pdf-lib';
import * as fontkit from 'fontkit';
import type { GenerateProps, Template } from '@pdfme/common';
import { checkGenerateProps } from '@pdfme/common';
import { builtInPlugins } from '@pdfme/schemas';
import { drawEmbeddedPage, getEmbeddedPagesAndEmbedPdfBoxes } from './pdfUtils';
import { TOOL_NAME } from './constants';

const preprocessing = async ({ template }: { template: Template }) => {
  const { basePdf } = template;

  const pdfDoc = await pdfLib.PDFDocument.create();
  // @ts-ignore
  pdfDoc.registerFontkit(fontkit);

  const pagesAndBoxes = await getEmbeddedPagesAndEmbedPdfBoxes({ pdfDoc, basePdf });
  const { embeddedPages, embedPdfBoxes } = pagesAndBoxes;

  return { pdfDoc, embeddedPages, embedPdfBoxes };
};

const postProcessing = ({ pdfDoc }: { pdfDoc: pdfLib.PDFDocument }) => {
  pdfDoc.setProducer(TOOL_NAME);
  pdfDoc.setCreator(TOOL_NAME);
};

const generate = async (props: GenerateProps) => {
  checkGenerateProps(props);
  const { inputs, template, options = {}, plugins: userPlugins = {} } = props;

  const { pdfDoc, embeddedPages, embedPdfBoxes } = await preprocessing({ template });

  const plugins = Object.values(userPlugins).length > 0 ? userPlugins : builtInPlugins;

  const _cache = new Map();

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
        const schemaObj = template.schemas[j];
        const schema = schemaObj[key];
        const value = inputObj[key];

        if (!schema || !value) {
          continue;
        }

        const render = Object.values(plugins).find(
          (plugin) => plugin.propPanel.defaultSchema.type === schema.type
        )?.pdf;
        if (!render) {
          throw new Error(`[@pdfme/generator] Renderer for type ${schema.type} not found.
Check this document: https://pdfme.com/docs/custom-schemas`);
        }
        await render({ value, schema, pdfLib, pdfDoc, page, options, _cache });
      }
    }
  }

  postProcessing({ pdfDoc });

  return pdfDoc.save();
};

export default generate;
