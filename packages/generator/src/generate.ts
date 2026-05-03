import * as pdfLib from '@pdfme/pdf-lib';
import type { GenerateProps, Schema, PDFRenderProps, Template } from '@pdfme/common';
import {
  checkGenerateProps,
  getDynamicTemplate,
  isBlankPdf,
  replacePlaceholders,
  pt2mm,
  cloneDeep,
} from '@pdfme/common';
import { getDynamicLayoutForTable } from '@pdfme/schemas/tables';
import { getDynamicLayoutForList } from '@pdfme/schemas/lists';
import {
  insertPage,
  preprocessing,
  postProcessing,
  getEmbedPdfPages,
  validateRequiredFields,
} from './helper.js';

type SchemaRenderInfo = {
  schemaNames: string[];
  schemaPages: Map<string, Schema>[];
};

const hasDynamicLayoutSchema = (schemas: Schema[][]) => {
  for (let i = 0; i < schemas.length; i += 1) {
    const schemaPage = schemas[i];
    for (let j = 0; j < schemaPage.length; j += 1) {
      const schemaType = schemaPage[j].type;
      if (schemaType === 'table' || schemaType === 'list') {
        return true;
      }
    }
  }
  return false;
};

const getSchemaRenderInfo = (schemas: Schema[][]): SchemaRenderInfo => {
  const schemaNameSet = new Set<string>();
  const schemaPages: Map<string, Schema>[] = [];

  for (let i = 0; i < schemas.length; i += 1) {
    const schemaPage = schemas[i];
    const schemaMap = new Map<string, Schema>();

    for (let j = 0; j < schemaPage.length; j += 1) {
      const schema = schemaPage[j];
      if (!schema.name) {
        continue;
      }
      schemaNameSet.add(schema.name);
      if (!schemaMap.has(schema.name)) {
        schemaMap.set(schema.name, schema);
      }
    }

    schemaPages.push(schemaMap);
  }

  return { schemaNames: Array.from(schemaNameSet), schemaPages };
};

const getAdjustedSchema = (
  schema: Schema,
  boundingBoxLeft: number,
  boundingBoxBottom: number,
): Schema => {
  if (boundingBoxLeft === 0 && boundingBoxBottom === 0) {
    return schema;
  }

  return {
    ...schema,
    position: {
      x: schema.position.x + boundingBoxLeft,
      y: schema.position.y - boundingBoxBottom,
    },
  };
};

const generate = async (props: GenerateProps): Promise<Uint8Array<ArrayBuffer>> => {
  checkGenerateProps(props);
  const { inputs, template: _template, options = {}, plugins: userPlugins = {} } = props;
  const template = cloneDeep(_template);

  const basePdf = template.basePdf;
  const isBlankBasePdf = isBlankPdf(basePdf);
  const staticSchemas = isBlankBasePdf ? (basePdf.staticSchema ?? []) : [];
  const shouldApplyDynamicTemplate = isBlankBasePdf && hasDynamicLayoutSchema(template.schemas);

  if (inputs.length === 0) {
    throw new Error(
      '[@pdfme/generator] inputs should not be empty, pass at least an empty object in the array',
    );
  }

  validateRequiredFields(template, inputs);

  const { pdfDoc, renderObj } = await preprocessing({ template, userPlugins });

  const _cache = new Map<string, unknown>();
  // Dynamic layout is only applied to blank PDFs, so custom base PDF pages can be embedded once.
  const cachedEmbedPdfPages = isBlankBasePdf
    ? undefined
    : await getEmbedPdfPages({
        template,
        pdfDoc,
      });
  const cachedRenderInfo = shouldApplyDynamicTemplate
    ? undefined
    : getSchemaRenderInfo(template.schemas);

  for (let i = 0; i < inputs.length; i += 1) {
    const input = inputs[i];

    const dynamicTemplate: Template = shouldApplyDynamicTemplate
      ? await getDynamicTemplate({
          template,
          input,
          options,
          _cache,
          getDynamicHeights: (value, args) => {
            switch (args.schema.type) {
              case 'table':
                return getDynamicLayoutForTable(value, args);
              case 'list':
                return getDynamicLayoutForList(value, args);
              default:
                return Promise.resolve([args.schema.height]);
            }
          },
        })
      : template;
    const { basePages, embedPdfBoxes } =
      cachedEmbedPdfPages ??
      (await getEmbedPdfPages({
        template: dynamicTemplate,
        pdfDoc,
      }));

    const schemas = dynamicTemplate.schemas;
    const { schemaNames, schemaPages } = shouldApplyDynamicTemplate
      ? getSchemaRenderInfo(schemas)
      : (cachedRenderInfo as SchemaRenderInfo);

    for (let j = 0; j < basePages.length; j += 1) {
      const basePage = basePages[j];
      const embedPdfBox = embedPdfBoxes[j];

      const boundingBoxLeft =
        basePage instanceof pdfLib.PDFEmbeddedPage ? pt2mm(embedPdfBox.mediaBox.x) : 0;
      const boundingBoxBottom =
        basePage instanceof pdfLib.PDFEmbeddedPage ? pt2mm(embedPdfBox.mediaBox.y) : 0;

      const page = insertPage({ basePage, embedPdfBox, pdfDoc });
      const variables = { ...input, totalPages: basePages.length, currentPage: j + 1 };

      if (staticSchemas.length > 0) {
        for (let k = 0; k < staticSchemas.length; k += 1) {
          const staticSchema = staticSchemas[k];
          const render = renderObj[staticSchema.type];
          if (!render) {
            continue;
          }
          const value = staticSchema.readOnly
            ? replacePlaceholders({
                content: staticSchema.content || '',
                variables,
                schemas,
              })
            : staticSchema.content || '';

          const adjustedStaticSchema = getAdjustedSchema(
            staticSchema,
            boundingBoxLeft,
            boundingBoxBottom,
          );

          const staticRenderProps: PDFRenderProps<Schema> = {
            value,
            schema: adjustedStaticSchema,
            basePdf,
            pdfLib,
            pdfDoc,
            page,
            options,
            _cache,
          };
          await render(staticRenderProps);
        }
      }

      const schemaPage = schemaPages[j];
      if (!schemaPage) {
        continue;
      }

      for (let l = 0; l < schemaNames.length; l += 1) {
        const name = schemaNames[l];
        const schema = schemaPage.get(name);
        if (!schema) {
          continue;
        }

        const render = renderObj[schema.type];
        if (!render) {
          continue;
        }
        const value: string = schema.readOnly
          ? replacePlaceholders({
              content: schema.content || '',
              variables,
              schemas,
            })
          : ((input[name] || '') as string);

        const adjustedSchema = getAdjustedSchema(schema, boundingBoxLeft, boundingBoxBottom);

        const renderProps: PDFRenderProps<Schema> = {
          value,
          schema: adjustedSchema,
          basePdf,
          pdfLib,
          pdfDoc,
          page,
          options,
          _cache,
        };
        await render(renderProps);
      }
    }
  }

  postProcessing({ pdfDoc, options });

  return pdfDoc.save();
};

export default generate;
