import * as pdfLib from '@pdfme/pdf-lib';
import type {
  GenerateProps,
  GeneratorOptions,
  Schema,
  PDFRenderProps,
  Template,
  PdfBytes,
} from '@pdfme/common';
import {
  checkGenerateProps,
  applyInternalLinkAnnotations,
  getDynamicTemplate,
  getReadOnlyTableValue,
  isBlankPdf,
  resolveReadOnlyContent,
  pt2mm,
  cloneDeep,
  mm2pt,
  registerInternalLinkAnchor,
  resetInternalLinkAnnotations,
} from '@pdfme/common';
import { getDynamicLayoutForSchema, isDynamicLayoutSchema } from '@pdfme/schemas/dynamicLayout';
import {
  insertPage,
  preprocessing,
  postProcessing,
  getEmbedPdfPages,
  validateRequiredFields,
} from './helper.js';

const hasDynamicLayoutSchema = (schemas: Schema[][]) => {
  for (let i = 0; i < schemas.length; i += 1) {
    const schemaPage = schemas[i];
    for (let j = 0; j < schemaPage.length; j += 1) {
      if (isDynamicLayoutSchema(schemaPage[j])) {
        return true;
      }
    }
  }
  return false;
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

const registerSchemaAnchor = (
  _cache: Map<string | number, unknown>,
  schema: Schema,
  page: pdfLib.PDFPage,
) => {
  if (!schema.name) return;

  registerInternalLinkAnchor({
    _cache,
    name: schema.name,
    page,
    x: mm2pt(schema.position.x),
    y: page.getHeight() - mm2pt(schema.position.y),
  });
};

const getRenderOptions = (options: GeneratorOptions): GeneratorOptions => {
  const renderOptions = { ...options };
  delete renderOptions.basePdfPassword;
  return renderOptions;
};

const generate = async (props: GenerateProps): Promise<PdfBytes> => {
  checkGenerateProps(props);
  const { inputs, template: _template, options = {}, plugins: userPlugins = {} } = props;
  const renderOptions = getRenderOptions(options);
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

  const _cache = new Map<string | number, unknown>();
  // Dynamic layout is only applied to blank PDFs, so custom base PDF pages can be embedded once.
  const cachedEmbedPdfPages = isBlankBasePdf
    ? undefined
    : await getEmbedPdfPages({
        options,
        template,
        pdfDoc,
      });

  for (let i = 0; i < inputs.length; i += 1) {
    const input = inputs[i];
    resetInternalLinkAnnotations(_cache);

    const dynamicTemplate: Template = shouldApplyDynamicTemplate
      ? await getDynamicTemplate({
          template,
          input,
          options: renderOptions,
          _cache,
          getDynamicHeights: getDynamicLayoutForSchema,
        })
      : template;
    const { basePages, embedPdfBoxes } =
      cachedEmbedPdfPages ??
      (await getEmbedPdfPages({
        options,
        template: dynamicTemplate,
        pdfDoc,
      }));

    const schemas = dynamicTemplate.schemas;

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
          const value =
            staticSchema.readOnly && staticSchema.type === 'table'
              ? getReadOnlyTableValue(staticSchema, input)
              : staticSchema.readOnly
                ? resolveReadOnlyContent({
                    schema: staticSchema,
                    variables,
                    schemas,
                  })
                : staticSchema.content || '';

          const adjustedStaticSchema = getAdjustedSchema(
            staticSchema,
            boundingBoxLeft,
            boundingBoxBottom,
          );
          registerSchemaAnchor(_cache, adjustedStaticSchema, page);

          const staticRenderProps: PDFRenderProps<Schema> = {
            value,
            schema: adjustedStaticSchema,
            basePdf,
            pdfLib,
            pdfDoc,
            page,
            options: renderOptions,
            _cache,
          };
          await render(staticRenderProps);
        }
      }

      const schemaPage = schemas[j] || [];
      for (let l = 0; l < schemaPage.length; l += 1) {
        const schema = schemaPage[l];
        if (!schema.name) {
          continue;
        }

        const render = renderObj[schema.type];
        if (!render) {
          continue;
        }
        const value: string =
          schema.readOnly && schema.type === 'table'
            ? getReadOnlyTableValue(schema, input)
            : schema.readOnly
              ? resolveReadOnlyContent({
                  schema,
                  variables,
                  schemas,
                })
              : ((input[schema.name] || '') as string);

        const adjustedSchema = getAdjustedSchema(schema, boundingBoxLeft, boundingBoxBottom);
        registerSchemaAnchor(_cache, adjustedSchema, page);

        const renderProps: PDFRenderProps<Schema> = {
          value,
          schema: adjustedSchema,
          basePdf,
          pdfLib,
          pdfDoc,
          page,
          options: renderOptions,
          _cache,
        };
        await render(renderProps);
      }
    }

    applyInternalLinkAnnotations({ _cache, pdfDoc });
  }

  postProcessing({ pdfDoc, options: renderOptions });

  return pdfDoc.save();
};

export default generate;
