import * as pdfLib from '@pdfme/pdf-lib';
import type { GenerateProps } from '@pdfme/common';
import { checkGenerateProps, getDynamicTemplate } from '@pdfme/common';
import { modifyTemplateForTable, getDynamicHeightForTable } from '@pdfme/schemas';
import { insertPage, preprocessing, postProcessing, getEmbedPdfPages } from './helper.js';

const generate = async (props: GenerateProps) => {
  checkGenerateProps(props);
  const { inputs, template, options = {}, plugins: userPlugins = {} } = props;
  const basePdf = template.basePdf;

  if (inputs.length === 0) {
    throw new Error('inputs should not be empty');
  }

  const { pdfDoc, renderObj } = await preprocessing({ template, userPlugins });

  const _cache = new Map();

  for (let i = 0; i < inputs.length; i += 1) {
    const input = inputs[i];

    const dynamicTemplate = await getDynamicTemplate({
      template,
      input,
      options,
      _cache,
      modifyTemplate: (arg) => {
        return modifyTemplateForTable(arg);
      },
      getDynamicHeight: (value, args) => {
        if (args.schema.type !== 'table') return Promise.resolve(args.schema.height);
        return getDynamicHeightForTable(value, args);
      },
    });
    const { basePages, embedPdfBoxes } = await getEmbedPdfPages({
      template: dynamicTemplate,
      pdfDoc,
    });
    const keys = dynamicTemplate.schemas.flatMap((schemaObj) => Object.keys(schemaObj));

    for (let j = 0; j < basePages.length; j += 1) {
      const basePage = basePages[j];
      const embedPdfBox = embedPdfBoxes[j];
      const page = insertPage({ basePage, embedPdfBox, pdfDoc });
      for (let l = 0; l < keys.length; l += 1) {
        const key = keys[l];
        const schemaObj = dynamicTemplate.schemas[j] || {};
        const schema = schemaObj[key];
        if (!schema) {
          continue;
        }

        const render = renderObj[schema.type];
        if (!render) {
          continue;
        }
        const value = schema.readOnly ? schema.content || '' : input[key];
        await render({ key, value, schema, basePdf, pdfLib, pdfDoc, page, options, _cache });
      }
    }
  }

  postProcessing({ pdfDoc, options });

  return pdfDoc.save();
};

export default generate;
