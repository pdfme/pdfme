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
import { getDynamicHeightsForTable } from '@pdfme/schemas';
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
      '[@pdfme/generator] inputs should not be empty, pass at least an empty object in the array',
    );
  }

  validateRequiredFields(template, inputs);

  const { pdfDoc, renderObj } = await preprocessing({ template, userPlugins });

  const _cache = new Map<string, unknown>();

  for (let i = 0; i < inputs.length; i += 1) {
    const input = inputs[i];

    // Get the dynamic template with proper typing
    const dynamicTemplate: Template = await getDynamicTemplate({
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

    // Add proper type assertion for dynamicTemplate.schemas
    const schemas = dynamicTemplate.schemas as Schema[][];
    // Create a type-safe array of schema names without using Set spread which requires downlevelIteration
    const schemaNameSet = new Set<string>();
    schemas.forEach((page: Schema[]) => {
      page.forEach((schema: Schema) => {
        if (schema.name) {
          schemaNameSet.add(schema.name);
        }
      });
    });
    const schemaNames = Array.from(schemaNameSet);

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
          const value = staticSchema.readOnly
            ? replacePlaceholders({
                content: staticSchema.content || '',
                variables: { ...input, totalPages: basePages.length, currentPage: j + 1 },
                schemas: schemas, // Use the properly typed schemas variable
              })
            : staticSchema.content || '';

          staticSchema.position = {
            x: staticSchema.position.x + boundingBoxLeft,
            y: staticSchema.position.y - boundingBoxBottom,
          };

          // Create properly typed render props for static schema
          const staticRenderProps: PDFRenderProps<Schema> = {
            value,
            schema: staticSchema,
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

      for (let l = 0; l < schemaNames.length; l += 1) {
        const name = schemaNames[l];
        const schemaPage = schemas[j] || [];
        const schema = schemaPage.find((s: Schema) => s.name == name);
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
              variables: { ...input, totalPages: basePages.length, currentPage: j + 1 },
              schemas: schemas, // Use the properly typed schemas variable
            })
          : ((input[name] || '') as string);

        schema.position = {
          x: schema.position.x + boundingBoxLeft,
          y: schema.position.y - boundingBoxBottom,
        };

        // Create properly typed render props
        const renderProps: PDFRenderProps<Schema> = {
          value,
          schema,
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
