import { PDFDocument } from '@pdfme/pdf-lib';
import * as fontkit from 'fontkit';
import type {
  Font,
  GenerateProps,
  Schema,
  SchemaInputs,
  Template,
  TextSchemaWithData,
} from '@pdfme/common';
import {
  calculateDynamicFontSize,
  getDefaultFont,
  getFallbackFontName,
  checkGenerateProps,
} from '@pdfme/common';
import {
  getEmbeddedPagesAndEmbedPdfBoxes,
  drawInputByTemplateSchema,
  drawEmbeddedPage,
  embedAndGetFontObj,
  InputImageCache,
} from './helper.js';
import { TOOL_NAME } from './constants.js';

const preprocessing = async (arg: { inputs: SchemaInputs[]; template: Template; font: Font }) => {
  const { template, font, inputs } = arg;
  const { basePdf, schemas } = template;
  const fallbackFontName = getFallbackFontName(font);

  const schemaFieldMapping = async (
    schemaFields: Record<string, Schema & { data?: string }>,
    schemaInputs: SchemaInputs,
    fallbackFontName: string
  ) => {
    for (const [key, value] of Object.entries(schemaFields)) {
      if (value.type !== 'text') continue;

      if (schemaInputs[key] !== undefined) {
        value.data = schemaInputs[key];
        value.fontName ??= fallbackFontName;
        value.fontSizeScalingMin ??= value.fontSize;
        value.fontSizeScalingMax ??= value.fontSize;
        value.fontSize = await calculateDynamicFontSize(value as TextSchemaWithData, font);
      }
    }

    return schemaFields;
  };

  schemas.map((schema: Record<string, Schema>, index: number) => {
    schemaFieldMapping(schema, inputs[index], fallbackFontName);
  });

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fontObj = await embedAndGetFontObj({ pdfDoc, font });

  const pagesAndBoxes = await getEmbeddedPagesAndEmbedPdfBoxes({ pdfDoc, basePdf });
  const { embeddedPages, embedPdfBoxes } = pagesAndBoxes;

  return { pdfDoc, fontObj, fallbackFontName, embeddedPages, embedPdfBoxes };
};

const postProcessing = (pdfDoc: PDFDocument) => {
  pdfDoc.setProducer(TOOL_NAME);
  pdfDoc.setCreator(TOOL_NAME);
};

const generate = async (props: GenerateProps) => {
  checkGenerateProps(props);
  const { inputs, template, options = {} } = props;
  const { font = getDefaultFont(), splitThreshold = 3 } = options;
  const { schemas } = template;

  const preRes = await preprocessing({ inputs, template, font });
  const { pdfDoc, fontObj, fallbackFontName, embeddedPages, embedPdfBoxes } = preRes;

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
        const textSchemaSetting = { fontObj, fallbackFontName, splitThreshold };

        // eslint-disable-next-line no-await-in-loop
        await drawInputByTemplateSchema({
          input,
          templateSchema,
          pdfDoc,
          page,
          pageHeight,
          textSchemaSetting,
          inputImageCache,
        });
      }
    }
  }

  postProcessing(pdfDoc);

  return pdfDoc.save();
};

export default generate;
