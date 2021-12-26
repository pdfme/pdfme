import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { GenerateArg, Template, Font, isPageSize, InputImageCache } from './libs/type';
import {
  checkInputs,
  checkFont,
  getFontNamesInSchemas,
  getFontObj,
  getEmbeddedPagesAndEmbedPdfBoxes,
  drawInputByTemplateSchema,
  getPageSize,
  drawEmbeddedPage,
} from './libs/generator';

const preprocessing = async (arg: {
  inputs: { [key: string]: string }[];
  template: Template;
  font: Font | undefined;
}) => {
  const { inputs, template, font } = arg;
  checkInputs(inputs);

  const { basePdf, schemas, fontName } = template;
  const defaultFontName = fontName ?? '';
  const fontNamesInSchemas = getFontNamesInSchemas(schemas);

  checkFont({ font, defaultFontName, fontNamesInSchemas });

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const isUseMyFont = Boolean(font) && (Boolean(defaultFontName) || fontNamesInSchemas.length > 0);

  const fontObj = await getFontObj({ pdfDoc, isUseMyFont, font });

  const pagesAndBoxes = await getEmbeddedPagesAndEmbedPdfBoxes({ pdfDoc, basePdf });
  const { embeddedPages, embedPdfBoxes } = pagesAndBoxes;

  return { pdfDoc, fontObj, embeddedPages, embedPdfBoxes, isUseMyFont };
};

const postProcessing = (pdfDoc: PDFDocument) => {
  const author = 'pdfme (https://github.com/hand-dot/pdfme)';
  pdfDoc.setProducer(author);
  pdfDoc.setCreator(author);
};

const generate = async ({ inputs, template, options = {} }: GenerateArg) => {
  const { basePdf, schemas } = template;
  const { font, splitThreshold = 3 } = options;

  const preArg = { inputs, template, font };
  const preRes = await preprocessing(preArg);
  const { pdfDoc, fontObj, embeddedPages, embedPdfBoxes, isUseMyFont } = preRes;

  const inputImageCache: InputImageCache = {};
  for (let i = 0; i < inputs.length; i += 1) {
    const inputObj = inputs[i];
    const keys = Object.keys(inputObj);
    for (let j = 0; j < (isPageSize(basePdf) ? schemas : embeddedPages).length; j += 1) {
      const embeddedPage = embeddedPages[j];
      const embedPdfBox = embedPdfBoxes[j];
      const { pageWidth, pageHeight } = getPageSize({ embeddedPage, basePdf });
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      drawEmbeddedPage({ page, basePdf, embeddedPage, embedPdfBox });
      for (let l = 0; l < keys.length; l += 1) {
        const key = keys[l];
        const schema = schemas[j];
        const templateSchema = schema[key];
        const input = inputObj[key];
        const defaultFontName = template.fontName ?? '';
        const textSchemaSetting = { isUseMyFont, fontObj, defaultFontName, splitThreshold };

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
