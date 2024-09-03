import { Template, Schema, BasePdf, CommonOptions, isBlankPdf } from '@pdfme/common';
import { createMultiTables, createSingleTable } from './tableHelper';
import { cloneDeep } from '../utils';
import { getBodyWithRange, getBody } from './helper.js';
import { TableSchema } from './types';

// NOTE: NOT USED
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

        const body = getBody(input?.[key]);
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
                content:
                  typeof input[key] !== 'string' ? JSON.stringify(input[key] || '[]') : input[key],
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

// NOTE: NOT USED
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

type PositionMapObj = {
  x: number; // original x position
  key: string;
  type: string;
  width: number; //original width
  newEndY: number; // new end y position i.e height + y (for tables its endY for last splitted table)
  parentTable?: string; // immediately lying under which table
};

const generatePositionMapAndSplitSchemas = async (args: {
  template: Template;
  input: Record<string, string>;
  _cache: Map<any, any>;
  options: CommonOptions;
}) => {
  const { template, options, input, _cache } = args;

  const { basePdf } = template;
  if (!isBlankPdf(basePdf)) throw new Error('[@pdfme/schema/table] Custom PDF is not supported');

  const pageHeight = basePdf.height;
  const paddingTop = basePdf.padding[0];
  const paddingBottom = basePdf.padding[2];

  const schemaObj = cloneDeep(template.schemas[0]) || {};

  // result
  const positionsMap = new Map<number, PositionMapObj[]>();
  const splittedSchemasMap = new Map<string, Schema[]>();

  // sorting all schemas by original y position
  const schemasSortedByYPosition = Object.entries(cloneDeep(schemaObj))
    .map(([key, schema]) => ({ ...schema, key }))
    .sort((a, b) => a.position.y - b.position.y);

  // #region generating positions map and also splitting tables
  for (const _schema of schemasSortedByYPosition) {
    const { key, ...schema } = _schema;
    // parent table for current schema -> table immaediatly lying above current schema in actual template page
    let parentTable: string | undefined = undefined;

    // old endY position for table in actual template page
    const actualOldY = schema.position.y + schema.height;

    // finding parent table ->
    // sorting previous schemas descending order so that will get to know after which table this table is immediately underlying
    const prevSchemasOldEndYPositions = Array.from(positionsMap.keys()).sort((a, b) => b - a);

    for (const _oldEndY of prevSchemasOldEndYPositions) {
      let parentFound = false;
      // for single _oldEndY we can have multiple schemas
      const entries = positionsMap.get(_oldEndY) || [];
      for (const entry of entries) {
        const { newEndY: parentNewEndY, key: parentKey, x, width, type } = entry;

        // checking if x axis of current schema is overlapping with parent schema when seen accross y axis
        // NOTE : we are checking x overlapping here because widgets which which are place aside table whould not affect by tables overflowing
        const isXOverlapping = areSchemasOverlappingOnXAxis(
          { x, width },
          { x: schema.position.x, width: schema.width }
        );

        // if current schema is below parent schema in original page and is overlapping on x axis
        // then we will update y position of current schema with the offset of parent's newEndY - oldEndY

        if (schema.position.y >= _oldEndY && isXOverlapping && type === 'table') {
          schema.position.y = schema.position.y + parentNewEndY - _oldEndY;
          // for tables we are adjusting y position to padding top before multi-table creation for tables overflowing according to above tables
          if (
            schema.type === 'table' &&
            schema.position.y + schema.height > pageHeight - paddingBottom
          ) {
            schema.position.y = paddingTop;
          }
          parentTable = parentKey;
          parentFound = true;
          break;
        }
      }
      if (parentFound) break;
    }

    // if schema is not table schema we just push this schema into map
    if (schema.type !== 'table') {
      positionsMap.set(actualOldY, [
        ...(positionsMap.get(actualOldY) || []),
        {
          key,
          parentTable,
          type: schema.type,
          width: schema.width,
          x: schema.position.x,
          newEndY: schema.height + schema.position.y,
        },
      ]);
      splittedSchemasMap.set(key, [schema]);
      continue;
    }

    // if current schema is table
    // creating multiple table schemas from single table
    const tables = await splitTableSchemas({
      schema: { ...(schema as TableSchema), key },
      input,
      options,
      _cache,
      template,
    });

    splittedSchemasMap.set(key, tables);

    // storing last table's position in map for old position
    const lastTable = tables.at(-1)!;
    positionsMap.set(actualOldY, [
      ...(positionsMap.get(actualOldY) || []),
      {
        key,
        parentTable,
        type: schema.type,
        width: schema.width,
        x: schema.position.x,
        newEndY: lastTable.height + lastTable.position.y,
      },
    ]);
  }

  return { positionsMap, splittedSchemasMap };
};

export const transformTemplateForSinglePageSchemas = async (params: {
  template: Template;
  input: Record<string, string>;
  _cache: Map<any, any>;
  options: CommonOptions;
}): Promise<Template> => {
  const { template: _template, input, options, _cache } = params;
  const { basePdf } = _template;
  const template = cloneDeep(_template);

  if (!isBlankPdf(basePdf)) throw new Error('[@pdfme/schema/table] Custom PDF is not supported');

  const pageHeight = basePdf.height;
  const paddingTop = basePdf.padding[0];
  const paddingBottom = basePdf.padding[2];

  // taking first schemas object as we are always gonna call this function with single page template
  const schemaObj = cloneDeep(template.schemas[0]) || {};

  // storing original schema order to maintain z-axis relationships (behind/above) between schemas
  const actualSchemaOrder = Object.keys(schemaObj).reduce(
    (pre, curr) => ({ ...pre, [curr]: undefined }),
    {} as { [key: string]: any }
  );

  // result
  const updatedSchemas: Template['schemas'] = [];

  // generating positions map by splitting tables and updating y positions
  const { positionsMap, splittedSchemasMap } = await generatePositionMapAndSplitSchemas({
    template,
    input,
    options,
    _cache,
  });

  let pageIndex = 0;

  // a map to store just last page index of a table in resultant schemas
  const schemaEndPageIndexMap = new Map<string, number>();

  // sorting positions in ascending order so that we can place all schemas in correct order
  const positionKeys = Array.from(positionsMap.keys()).sort((a, b) => a - b);

  for (const oldY of positionKeys) {
    const entries = positionsMap.get(oldY) || [];
    for (const entry of entries) {
      const { key: schemaKey, parentTable } = entry;

      // for now splitting of schemas is applicable only for tables but we can extend it further so
      // just mentioning this splitted schemas and if those are not present we will use original schema
      const splittedSchemas: Schema[] = splittedSchemasMap.get(schemaKey) || [];

      splittedSchemas.forEach((sc, index) => {
        // for first splitted schema
        if (index === 0) {
          const isSchemaOverflowing = sc.height + sc.position.y > pageHeight - paddingBottom;
          if (parentTable) {
            // if we have parent table then starting from end page of that table
            pageIndex = schemaEndPageIndexMap.get(parentTable)!;
          }
          // if schema cannot fit on same page we will just increment page and set y as padding top for non-table schemas
          // or if schema is table and have a parent table its padding top shows that it overflown from previous page
          if (
            isSchemaOverflowing ||
            (sc.type === 'table' && parentTable && sc.position.y === paddingTop)
          ) {
            pageIndex++;
            sc.position.y = paddingTop;
          }
          // independant non-table widgets without any parent table and non overlapping with any table on x axis
          if (!parentTable && sc.type !== 'table') {
            pageIndex = 0;
          }
        }
        // for additional table schemas just increment pageIndex
        // for now this will get executed only for tables
        if (index !== 0) pageIndex++;
        // assigning schema to correct page
        // initializing page with empty actual schema order
        if (!updatedSchemas[pageIndex]) updatedSchemas[pageIndex] = { ...actualSchemaOrder };
        updatedSchemas[pageIndex][schemaKey] = sc;
        // marking actual last page of each widget
        const isLast = index === splittedSchemas.length - 1;
        if (isLast) schemaEndPageIndexMap.set(schemaKey, pageIndex);
      });
    }
  }

  // just removing undefined schema which were used to preserve field order
  for (const _updatedSchema of updatedSchemas) {
    for (const key in _updatedSchema) {
      if (!_updatedSchema[key]) {
        delete _updatedSchema[key];
      }
    }
  }

  return { ...template, schemas: cloneDeep(updatedSchemas) };
};

const areSchemasOverlappingOnXAxis = (
  schema1: { x: number; width: number },
  schema2: { x: number; width: number }
) => {
  const { x: x1, width: width1 } = schema1;
  const { x: x2, width: width2 } = schema2;
  if (x1 === x2) return true;

  if (x1 < x2) return x1 + width1 > x2;

  return x2 + width2 > x1;
};

const splitTableSchemas = async (args: {
  schema: TableSchema & { key: string };
  input: Record<string, string>;
  _cache: Map<any, any>;
  options: CommonOptions;
  template: Template;
}) => {
  const { schema: _schema, input, options, _cache, template } = args;
  const { key, ...schema } = cloneDeep(_schema);

  const tables = await createMultiTables(getBody(input?.[key] || '[]'), {
    schema,
    basePdf: template.basePdf,
    options,
    _cache,
  });

  // multiple table schemas from one schema
  return tables.map((table) => {
    return {
      ...(schema as TableSchema),
      height: table.getHeight(),
      readOnly: true, //  making all tables readOnly after populating data as content will be picked up as value for pdf render
      content: JSON.stringify(table.body.map((x) => x.raw)),
      showHead: table.settings.showHead,
      position: {
        ...schema.position,
        y: table.settings.startY,
      },
    };
  });
};
