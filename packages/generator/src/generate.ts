import * as pdfLib from '@pdfme/pdf-lib';
import type { GenerateProps, Size } from '@pdfme/common';
import { checkGenerateProps } from '@pdfme/common';
import { insertPage, preprocessing, postProcessing } from './helper.js';
import { dryRunAutoTable } from '@pdfme/schemas';

const generate = async (props: GenerateProps) => {
  checkGenerateProps(props);
  const { inputs, template, options = {}, plugins: userPlugins = {} } = props;

  if (inputs.length === 0) {
    throw new Error('inputs should not be empty');
  }

  const { pdfDoc, basePages, embedPdfBoxes, renderObj } = await preprocessing({
    template,
    userPlugins,
  });

  const _cache = new Map();

  for (const schemaObj of template.schemas) {
    for (const entry of Object.entries(schemaObj)) {
      const [key, schema] = entry;
      if (schema.type !== 'table') continue;
      console.log(schema);
      const body = JSON.parse(inputs[0][key] || '[]') as string[][];
      const pageWidth = (template.basePdf as Size).width;
      const tableArg = { schema, options, _cache };
      // @ts-ignore
      const table = await dryRunAutoTable(body, tableArg, pageWidth);

      const diff = table.getHeight() - schema.height;
      console.log('table.getHeight()', table.getHeight());
      console.log('schema.height', schema.height);
      console.log('diff', diff);
      // TODO ここから
      // とりあえずフォームから行数を増やして、改ページできるようにする
      // ここで schema.y よりも大きい他のスキーマの y を増加させる
      // さらにオーバーフローした場合は、ページを追加する
    }
  }

  const keys = template.schemas.flatMap((schemaObj) => Object.keys(schemaObj));

  for (let i = 0; i < inputs.length; i += 1) {
    const inputObj = inputs[i];
    for (let j = 0; j < basePages.length; j += 1) {
      const basePage = basePages[j];
      const embedPdfBox = embedPdfBoxes[j];
      const page = insertPage({ basePage, embedPdfBox, pdfDoc });
      for (let l = 0; l < keys.length; l += 1) {
        const key = keys[l];
        const schemaObj = template.schemas[j] || {};
        const schema = schemaObj[key];
        if (!schema) {
          continue;
        }

        const render = renderObj[schema.type];
        if (!render) {
          continue;
        }
        const value = schema.readOnly ? schema.content || '' : inputObj[key];
        await render({ key, value, schema, pdfLib, pdfDoc, page, options, _cache });
      }
    }
  }

  postProcessing({ pdfDoc, options });

  return pdfDoc.save();
};

export default generate;
