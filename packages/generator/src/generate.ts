import * as pdfLib from '@pdfme/pdf-lib';
import * as fontkit from 'fontkit';
import type { GenerateProps, GeneratorOptions, Template } from '@pdfme/common';
import { checkGenerateProps } from '@pdfme/common';
import { builtInPlugins } from '@pdfme/schemas';
import { drawEmbeddedPage, getEmbeddedPagesAndEmbedPdfBoxes } from './pdfUtils.js';
import { TOOL_NAME } from './constants.js';

const preprocessing = async ({ template }: { template: Template }) => {
  const { basePdf } = template;

  const pdfDoc = await pdfLib.PDFDocument.create();
  // @ts-ignore
  pdfDoc.registerFontkit(fontkit);

  const pagesAndBoxes = await getEmbeddedPagesAndEmbedPdfBoxes({ pdfDoc, basePdf });
  const { embeddedPages, embedPdfBoxes } = pagesAndBoxes;

  return { pdfDoc, embeddedPages, embedPdfBoxes };
};

const postProcessing = (props: { pdfDoc: pdfLib.PDFDocument; options: GeneratorOptions }) => {
  const { pdfDoc, options } = props;
  const {
    author = TOOL_NAME,
    creationDate = new Date(),
    creator = TOOL_NAME,
    keywords = [],
    language = 'en-US',
    modificationDate = new Date(),
    producer = TOOL_NAME,
    subject = '',
    title = '',
  } = options;
  pdfDoc.setAuthor(author);
  pdfDoc.setCreationDate(creationDate);
  pdfDoc.setCreator(creator);
  pdfDoc.setKeywords(keywords);
  pdfDoc.setLanguage(language);
  pdfDoc.setModificationDate(modificationDate);
  pdfDoc.setProducer(producer);
  pdfDoc.setSubject(subject);
  pdfDoc.setTitle(title);
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

  postProcessing({ pdfDoc, options });

  return pdfDoc.save();
};

export default generate;
