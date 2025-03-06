import * as fontkit from 'fontkit';
import {
  Schema,
  Plugins,
  GeneratorOptions,
  Template,
  PDFRenderProps,
  Plugin,
  getB64BasePdf,
  isBlankPdf,
  mm2pt,
  BasePdf,
} from '@pdfme/common';
import { builtInPlugins } from '@pdfme/schemas';
import { PDFPage, PDFDocument, PDFEmbeddedPage, TransformationMatrix } from '@pdfme/pdf-lib';
import { TOOL_NAME } from './constants.js';
import type { EmbedPdfBox } from './types.js';

export const getEmbedPdfPages = async (arg: { template: Template; pdfDoc: PDFDocument }) => {
  const {
    template: { schemas, basePdf },
    pdfDoc,
  } = arg as { template: { schemas: Schema[][]; basePdf: BasePdf }; pdfDoc: PDFDocument };
  let basePages: (PDFEmbeddedPage | PDFPage)[] = [];
  let embedPdfBoxes: EmbedPdfBox[] = [];

  if (isBlankPdf(basePdf)) {
    const { width: _width, height: _height } = basePdf;
    const width = mm2pt(_width);
    const height = mm2pt(_height);
    basePages = schemas.map(() => {
      const page = PDFPage.create(pdfDoc);
      page.setSize(width, height);
      return page;
    });
    embedPdfBoxes = schemas.map(() => ({
      mediaBox: { x: 0, y: 0, width, height },
      bleedBox: { x: 0, y: 0, width, height },
      trimBox: { x: 0, y: 0, width, height },
    }));
  } else {
    const willLoadPdf = await getB64BasePdf(basePdf);
    const embedPdf = await PDFDocument.load(willLoadPdf);
    const embedPdfPages = embedPdf.getPages();
    embedPdfBoxes = embedPdfPages.map((p) => ({
      mediaBox: p.getMediaBox(),
      bleedBox: p.getBleedBox(),
      trimBox: p.getTrimBox(),
    }));
    const boundingBoxes = embedPdfPages.map((p) => {
      const { x, y, width, height } = p.getMediaBox();
      return { left: x, bottom: y, right: width, top: height + y };
    });
    const transformationMatrices = embedPdfPages.map(
      () => [1, 0, 0, 1, 0, 0] as TransformationMatrix,
    );
    basePages = await pdfDoc.embedPages(embedPdfPages, boundingBoxes, transformationMatrices);
  }
  return { basePages, embedPdfBoxes };
};

export const validateRequiredFields = (template: Template, inputs: Record<string, unknown>[]) => {
  (template.schemas as Schema[][]).forEach((schemaPage: Schema[]) =>
    schemaPage.forEach((schema: Schema) => {
      if (schema.required && !schema.readOnly && !inputs.some((input) => input[schema.name])) {
        throw new Error(
          `[@pdfme/generator] input for '${schema.name}' is required to generate this PDF`,
        );
      }
    }),
  );
};

export const preprocessing = async (arg: { template: Template; userPlugins: Plugins }) => {
  const { template, userPlugins } = arg;
  const { schemas, basePdf } = template as { schemas: Schema[][]; basePdf: BasePdf };
  const staticSchema: Schema[] = isBlankPdf(basePdf) ? (basePdf.staticSchema ?? []) : [];

  const pdfDoc = await PDFDocument.create();
  // @ts-expect-error registerFontkit method is not in type definitions but exists at runtime
  pdfDoc.registerFontkit(fontkit);

  const pluginValues = (
    Object.values(userPlugins).length > 0
      ? Object.values(userPlugins)
      : Object.values(builtInPlugins)
  ) as Plugin<Schema>[];

  const schemaTypes = Array.from(
    new Set(
      schemas
        .flatMap((schemaPage: Schema[]) => schemaPage.map((schema: Schema) => schema.type))
        .concat(staticSchema.map((schema: Schema) => schema.type)),
    ),
  );

  const renderObj = schemaTypes.reduce(
    (
      acc: Record<
        string,
        (arg: PDFRenderProps<Schema & { [key: string]: unknown }>) => Promise<void> | void
      >,
      type: string,
    ) => {
      const render = pluginValues.find((pv) => {
        // Safely check if propPanel and defaultSchema exist and have a type property
        return (
          pv &&
          typeof pv === 'object' &&
          'propPanel' in pv &&
          pv.propPanel &&
          typeof pv.propPanel === 'object' &&
          'defaultSchema' in pv.propPanel &&
          pv.propPanel.defaultSchema &&
          typeof pv.propPanel.defaultSchema === 'object' &&
          'type' in pv.propPanel.defaultSchema &&
          pv.propPanel.defaultSchema.type === type
        );
      });

      if (!render) {
        throw new Error(`[@pdfme/generator] Renderer for type ${type} not found.
Check this document: https://pdfme.com/docs/custom-schemas`);
      }

      // Use type assertion to handle the pdf function with schema type
      return {
        ...acc,
        [type]: render.pdf as (
          arg: PDFRenderProps<Schema & { [key: string]: unknown }>,
        ) => Promise<void> | void,
      };
    },
    {} as Record<
      string,
      (arg: PDFRenderProps<Schema & { [key: string]: unknown }>) => Promise<void> | void
    >,
  );

  return { pdfDoc, renderObj };
};

export const postProcessing = (props: { pdfDoc: PDFDocument; options: GeneratorOptions }) => {
  const { pdfDoc, options } = props;
  const {
    author = TOOL_NAME,
    creationDate = new Date(),
    creator = TOOL_NAME,
    keywords = [],
    lang = 'en',
    modificationDate = new Date(),
    producer = TOOL_NAME,
    subject = '',
    title = '',
  } = options;
  pdfDoc.setAuthor(author);
  pdfDoc.setCreationDate(creationDate);
  pdfDoc.setCreator(creator);
  pdfDoc.setKeywords(keywords);
  pdfDoc.setLanguage(lang);
  pdfDoc.setModificationDate(modificationDate);
  pdfDoc.setProducer(producer);
  pdfDoc.setSubject(subject);
  pdfDoc.setTitle(title);
};

export const insertPage = (arg: {
  basePage: PDFEmbeddedPage | PDFPage;
  embedPdfBox: EmbedPdfBox;
  pdfDoc: PDFDocument;
}) => {
  const { basePage, embedPdfBox, pdfDoc } = arg;
  const size = basePage instanceof PDFEmbeddedPage ? basePage.size() : basePage.getSize();
  const insertedPage =
    basePage instanceof PDFEmbeddedPage
      ? pdfDoc.addPage([size.width, size.height])
      : pdfDoc.addPage(basePage);

  if (basePage instanceof PDFEmbeddedPage) {
    insertedPage.drawPage(basePage);
    const { mediaBox, bleedBox, trimBox } = embedPdfBox;
    insertedPage.setMediaBox(mediaBox.x, mediaBox.y, mediaBox.width, mediaBox.height);
    insertedPage.setBleedBox(bleedBox.x, bleedBox.y, bleedBox.width, bleedBox.height);
    insertedPage.setTrimBox(trimBox.x, trimBox.y, trimBox.width, trimBox.height);
  }

  return insertedPage;
};
