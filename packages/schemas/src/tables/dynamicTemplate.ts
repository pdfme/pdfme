import { Template, Schema, BasePdf, CommonOptions } from '@pdfme/common';
import { createMultiTables } from './tableHelper';

const cloneDeep = <T>(value: T): T => JSON.parse(JSON.stringify(value));

// TODO ここから
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

export const getDynamicHeightForTable = (
  value: string,
  args: {
    schema: Schema;
    basePdf: BasePdf;
    options: CommonOptions;
    _cache: Map<any, any>;
  }
): Promise<number> => {
  const body = JSON.parse(value || '[]') as string[][];

  return Promise.resolve(0);
};
