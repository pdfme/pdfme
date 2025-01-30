import * as pdfLib from '@pdfme/pdf-lib';
import type { GenerateProps } from '@pdfme/common';
import {
  checkGenerateProps,
  getDynamicTemplate,
  isBlankPdf,
  replacePlaceholders,
  pt2mm,
  cloneDeep,
} from '@pdfme/common';
import { getDynamicHeightsForTable } from '@pdfme/schemas/utils';
import {
  insertPage,
  preprocessing,
  postProcessing,
  getEmbedPdfPages,
  validateRequiredFields,
} from './helper.js';

const generate = async (props: GenerateProps) => {
  checkGenerateProps(props);
  const { inputs, template: _template, options = {}, plugins: userPlugins = {} } = props;
  const template = cloneDeep(_template);

  const basePdf = template.basePdf;

  if (inputs.length === 0) {
    throw new Error(
      '[@pdfme/generator] inputs should not be empty, pass at least an empty object in the array'
    );
  }

  validateRequiredFields(template, inputs);

  const { pdfDoc, renderObj } = await preprocessing({ template, userPlugins });

  const _cache = new Map();

  for (let i = 0; i < inputs.length; i += 1) {
    const input = inputs[i];

    const dynamicTemplate = await getDynamicTemplate({
      template,
      input,
      options,
      _cache,
      getDynamicHeights: (value, args) => {
        switch (args.schema.type) {
          case 'table':
            return getDynamicHeightsForTable(value, args);
          default:
            return Promise.resolve([args.schema.height]);
        }
      },
    });
    const { basePages, embedPdfBoxes } = await getEmbedPdfPages({
      template: dynamicTemplate,
      pdfDoc,
    });
    const schemaNames = [
      ...new Set(dynamicTemplate.schemas.flatMap((page) => page.map((schema) => schema.name))),
    ];

    for (let j = 0; j < basePages.length; j += 1) {
      const basePage = basePages[j];
      const embedPdfBox = embedPdfBoxes[j];

      const boundingBoxLeft =
        basePage instanceof pdfLib.PDFEmbeddedPage ? pt2mm(embedPdfBox.mediaBox.x) : 0;
      const boundingBoxBottom =
        basePage instanceof pdfLib.PDFEmbeddedPage ? pt2mm(embedPdfBox.mediaBox.y) : 0;

      const page = insertPage({ basePage, embedPdfBox, pdfDoc });

      if (isBlankPdf(basePdf) && basePdf.staticSchema) {
        for (let k = 0; k < basePdf.staticSchema.length; k += 1) {
          const staticSchema = basePdf.staticSchema[k];
          const render = renderObj[staticSchema.type];
          if (!render) {
            continue;
          }
          const value = replacePlaceholders({
            content: staticSchema.content || '',
            variables: { ...input, totalPages: basePages.length, currentPage: j + 1 },
            schemas: dynamicTemplate.schemas,
          });

          staticSchema.position = {
            x: staticSchema.position.x + boundingBoxLeft,
            y: staticSchema.position.y - boundingBoxBottom,
          };

          await render({
            value,
            schema: staticSchema,
            basePdf,
            pdfLib,
            pdfDoc,
            page,
            options,
            _cache,
          });
        }
      }

      for (let l = 0; l < schemaNames.length; l += 1) {
        const name = schemaNames[l];
        const schemaPage = dynamicTemplate.schemas[j] || [];
        const schema = schemaPage.find((s) => s.name == name);
        if (!schema) {
          continue;
        }

        const render = renderObj[schema.type];
        if (!render) {
          continue;
        }
        const value = schema.readOnly
          ? replacePlaceholders({
              content: schema.content || '',
              variables: { ...input, totalPages: basePages.length, currentPage: j + 1 },
              schemas: dynamicTemplate.schemas,
            })
          : input[name] || '';

        schema.position = {
          x: schema.position.x + boundingBoxLeft,
          y: schema.position.y - boundingBoxBottom,
        };

        await render({
          value,
          schema,
          basePdf,
          pdfLib,
          pdfDoc,
          page,
          options,
          _cache,
        });
      }
    }
  }

  postProcessing({ pdfDoc, options });

  return pdfDoc.save();
};

export default generate;
