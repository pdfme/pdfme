import { Template, Schema, BasePdf, CommonOptions } from '@pdfme/common';
import { createMultiTables, createSingleTable } from './tableHelper';

const cloneDeep = <T>(value: T): T => JSON.parse(JSON.stringify(value));

// TODO ここから
// そもそもinputでstringしか渡せないので使いにくい。
// デバッグも兼ねてjsonで渡せるようにしたいかも
/*
[
    {
        "billedToInput": "\nImani Olowe \n+123-456-7890 \n63 Ivy Road, Hawkville, GA, USA 31036",
        "info": "Invoice No. 12345\n16 June 2025",
        "orders": [
            ["Eggshell Camisole Top","$123","$123","Row 1","Row 1"],
            ["Cuban Collar Shirt","$127","$254","Row 2","Row 2"],
            ["","","","",""],
            ["","","","",""],
            ["","","","",""],
            ["","","","","aaaa"]
        ]
    }
]
---
[
    {
        "billedToInput": "\nImani Olowe \n+123-456-7890 \n63 Ivy Road, Hawkville, GA, USA 31036",
        "info": "Invoice No. 12345\n16 June 2025",
        "orders": [
            ["Eggshell Camisole Top","$123","$123","Row 1","Row 1"],
            ["Cuban Collar Shirt","$127","$254","Row 2","Row 2"],
            ["","","","",""],
            ["","","","",""],
            ["","","","",""],
            ["","","","","aaaa"]
        ],
        "info copy": "Invoice No. 12345\n16 June 2025"
    }
]
*/
export const modifyTemplateForTable = async (arg: {
  template: Template;
  input: Record<string, string>;
  _cache: Map<any, any>;
  options: CommonOptions;
}): Promise<Template> => {
  const { template: t, input, options, _cache } = arg;
  const template: Template = Object.assign(cloneDeep(t), { schemas: [] });
  let pageIndex = 0;
  for (const schemaObj of t.schemas) {
    const additionalSchemaObj: typeof schemaObj = {};
    for (const [key, schema] of Object.entries(schemaObj)) {
      if (schema.type === 'table') {
        schema.__bodyRange = undefined;
        const body = JSON.parse(input[key] || '[]') as string[][];
        const tables = await createMultiTables(body, {
          schema,
          basePdf: template.basePdf,
          options,
          _cache,
        });
        if (tables.length > 1) {
          const table0 = tables[0];
          const table1 = tables[1];
          schema.__bodyRange = { start: 0, end: table0.body.length };

          const newKey = key;
          additionalSchemaObj[newKey] = {
            ...schema,
            position: { x: schema.position.x, y: table1.settings.startY },
            height: table1.getHeight(),
            showHead: false,
            __bodyRange: { start: table0.body.length },
            content: input[key],
          };
          // if (input[newKey] !== input[key] && onChangeInput) {
          //   onChangeInput({ index: unitCursor, key: newKey, value: input[key] });
          // }
        }
      }
    }
    template.schemas.push(schemaObj);
    // ここで分割したテーブルがある場合は追加するべき？
    if (Object.keys(additionalSchemaObj).length > 0) {
      if (!t.schemas[pageIndex + 1]) {
        template.schemas.push(additionalSchemaObj);
      } else {
        template.schemas[pageIndex + 1] = additionalSchemaObj;
      }
    }
    pageIndex++;
  }
  return template;
};

export const getDynamicHeightForTable = async (
  value: string,
  args: {
    schema: Schema;
    basePdf: BasePdf;
    options: CommonOptions;
    _cache: Map<any, any>;
  }
): Promise<number> => {
  if (args.schema.type !== 'table') return Promise.resolve(args.schema.height);
  const body = JSON.parse(value || '[]') as string[][];
  const table = await createSingleTable(body, args);
  return table.getHeight();
};
