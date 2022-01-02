import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { GenerateProps, Template, Font, isPageSize, InputImageCache } from './libs/type';
import {
  getEmbeddedPagesAndEmbedPdfBoxes,
  drawInputByTemplateSchema,
  getPageSize,
  drawEmbeddedPage,
  embedAndGetFontObj,
} from './libs/generator';
import { getDefaultFont, getFallbackFontName, checkProps } from './libs/helper';
import { TOOL_NAME } from './libs/constants';

const preprocessing = async (arg: {
  inputs: { [key: string]: string }[];
  template: Template;
  font: Font;
}) => {
  const { template, font } = arg;

  const { basePdf } = template;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fallbackFontName = getFallbackFontName(font);
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
  checkProps(props, GenerateProps);
  const { inputs, template, options = {} } = props;
  const { font = getDefaultFont(), splitThreshold = 3 } = options;
  const { basePdf, schemas } = template;

  const preRes = await preprocessing({ inputs, template, font });
  const { pdfDoc, fontObj, fallbackFontName, embeddedPages, embedPdfBoxes } = preRes;

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
