import { Template, Schema, BasePdf, CommonOptions } from '@pdfme/common';
import { createMultiTables, createSingleTable } from './tableHelper';
import { cloneDeep } from '../utils';
import { getBodyWithRange, getBody } from './helper.js';
import { TableSchema } from './types';
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
    const additionalSchemaObjs: (typeof schemaObj)[] = [];
    for (const [key, schema] of Object.entries(schemaObj)) {
      if (schema.type === 'table') {
        schema.__bodyRange = undefined;
        const body = JSON.parse(input?.[key] || '[]') as string[][];
        const tables = await createMultiTables(body, {
          schema,
          basePdf: template.basePdf,
          options,
          _cache,
        });
        if (tables.length > 1) {
          const firstTable = tables[0];
          schema.__bodyRange = { start: 0, end: firstTable.body.length };
          const allBodies = tables.map((table) => table.body);
          const from2ndTable = tables.slice(1);
          from2ndTable.forEach((table, i) => {
            const additionalPageIndex = pageIndex + i + 1;

            const additionalSchemaObj = {
              [key]: {
                ...schema,
                position: { x: schema.position.x, y: table.settings.startY },
                height: table.getHeight(),
                showHead: false,
                __bodyRange: {
                  start: allBodies.slice(0, i + 1).reduce((acc, cur) => acc + cur.length, 0),
                  end: allBodies.slice(0, i + 2).reduce((acc, cur) => acc + cur.length, 0),
                },
                content: input[key],
              },
            };
            additionalSchemaObjs[additionalPageIndex] = additionalSchemaObj;
          });
        }
      }
    }
    template.schemas.push(schemaObj);
    additionalSchemaObjs.forEach((obj, index) => {
      if (!template.schemas[index]) {
        template.schemas[index] = obj;
      } else {
        template.schemas[index] = { ...template.schemas[index], ...obj };
      }
    });
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
  const schema = args.schema as TableSchema;
  const body =
    schema.__bodyRange?.start === 0 ? getBody(value) : getBodyWithRange(value, schema.__bodyRange);
  const table = await createSingleTable(body, args);
  return table.getHeight();
};
