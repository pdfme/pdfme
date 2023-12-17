import * as fontkit from 'fontkit';
import * as pdfLib from '@pdfme/pdf-lib';
import type { GeneratorOptions, Template, PDFRenderProps, Plugin } from '@pdfme/common';
import type { Schema, Plugins } from '@pdfme/common';
import { builtInPlugins } from '@pdfme/schemas';
import { PDFPage, PDFDocument, PDFEmbeddedPage, TransformationMatrix } from '@pdfme/pdf-lib';
import { getB64BasePdf, BasePdf } from '@pdfme/common';
import { TOOL_NAME } from './constants.js';
import type { EmbedPdfBox } from './types';

export const getEmbeddedPagesAndEmbedPdfBoxes = async (arg: {
  pdfDoc: PDFDocument;
  basePdf: BasePdf;
}) => {
  const { pdfDoc, basePdf } = arg;
  let embeddedPages: PDFEmbeddedPage[] = [];
  let embedPdfBoxes: EmbedPdfBox[] = [];
  const willLoadPdf = typeof basePdf === 'string' ? await getB64BasePdf(basePdf) : basePdf;
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
    () => [1, 0, 0, 1, 0, 0] as TransformationMatrix
  );

  embeddedPages = await pdfDoc.embedPages(embedPdfPages, boundingBoxes, transformationMatrices);

  return { embeddedPages, embedPdfBoxes };
};

export const drawEmbeddedPage = (arg: {
  page: PDFPage;
  embeddedPage: PDFEmbeddedPage;
  embedPdfBox: EmbedPdfBox;
}) => {
  const { page, embeddedPage, embedPdfBox } = arg;
  page.drawPage(embeddedPage);
  const { mediaBox: mb, bleedBox: bb, trimBox: tb } = embedPdfBox;
  page.setMediaBox(mb.x, mb.y, mb.width, mb.height);
  page.setBleedBox(bb.x, bb.y, bb.width, bb.height);
  page.setTrimBox(tb.x, tb.y, tb.width, tb.height);
};

export const preprocessing = async (arg: { template: Template; userPlugins: Plugins }) => {
  const { template, userPlugins } = arg;
  const { basePdf, schemas } = template;

  const pdfDoc = await pdfLib.PDFDocument.create();
  // @ts-ignore
  pdfDoc.registerFontkit(fontkit);

  const pagesAndBoxes = await getEmbeddedPagesAndEmbedPdfBoxes({ pdfDoc, basePdf });
  const { embeddedPages, embedPdfBoxes } = pagesAndBoxes;

  const pluginValues = (
    Object.values(userPlugins).length > 0
      ? Object.values(userPlugins)
      : Object.values(builtInPlugins)
  ) as Plugin<Schema>[];

  const schemaTypes = schemas.flatMap((schemaObj) =>
    Object.values(schemaObj).map((schema) => schema.type)
  );

  const renderObj = schemaTypes.reduce((acc, type) => {
    const render = pluginValues.find((pv) => pv.propPanel.defaultSchema.type === type);

    if (!render) {
      throw new Error(`[@pdfme/generator] Renderer for type ${type} not found.
Check this document: https://pdfme.com/docs/custom-schemas`);
    }
    return { ...acc, [type]: render.pdf };
  }, {} as Record<string, (arg: PDFRenderProps<Schema>) => Promise<void> | void>);

  const readOnlySchemaKeys = schemas.reduce((acc, schema) => {
    const entries = Object.entries(schema);
    const keys = entries.reduce(
      (acc, [key, value]) => (value.readOnly ? [...acc, key] : acc),
      [] as string[]
    );
    return [...acc, ...keys];
  }, [] as string[]);

  return { pdfDoc, embeddedPages, embedPdfBoxes, renderObj, readOnlySchemaKeys };
};

export const postProcessing = (props: {
  pdfDoc: pdfLib.PDFDocument;
  options: GeneratorOptions;
}) => {
  const { pdfDoc, options } = props;
  const {
    author = TOOL_NAME,
    creationDate = new Date(),
    creator = TOOL_NAME,
    keywords = [],
    language = 'en-US',
    modificationDate = new Date(),
    producer = TOOL_NAME,
    subject = '',
    title = '',
  } = options;
  pdfDoc.setAuthor(author);
  pdfDoc.setCreationDate(creationDate);
  pdfDoc.setCreator(creator);
  pdfDoc.setKeywords(keywords);
  pdfDoc.setLanguage(language);
  pdfDoc.setModificationDate(modificationDate);
  pdfDoc.setProducer(producer);
  pdfDoc.setSubject(subject);
  pdfDoc.setTitle(title);
};
