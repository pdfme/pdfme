import * as fontkit from 'fontkit';
import {
  Size,
  Schema,
  Plugins,
  GeneratorOptions,
  Template,
  PDFRenderProps,
  Plugin,
  getB64BasePdf,
  BasePdf,
  isBlankPdf,
  mm2pt,
} from '@pdfme/common';
import { builtInPlugins, autoTable } from '@pdfme/schemas';
import { PDFPage, PDFDocument, PDFEmbeddedPage, TransformationMatrix } from '@pdfme/pdf-lib';
import { TOOL_NAME } from './constants.js';
import type { EmbedPdfBox } from './types';

const getBasePagesAndEmbedPdfBoxes = async (arg: {
  template: Template;
  pdfDoc: PDFDocument;
  basePdf: BasePdf;
}) => {
  const {
    template: { schemas },
    pdfDoc,
    basePdf,
  } = arg;
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
    const willLoadPdf = typeof basePdf === 'string' ? await getB64BasePdf(basePdf) : basePdf;
    const embedPdf = await PDFDocument.load(willLoadPdf as ArrayBuffer | Uint8Array | string);
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
    basePages = await pdfDoc.embedPages(embedPdfPages, boundingBoxes, transformationMatrices);
  }
  return { basePages, embedPdfBoxes };
};

export const preprocessing = async (arg: { template: Template; userPlugins: Plugins }) => {
  const { template, userPlugins } = arg;
  const { basePdf, schemas } = template;

  const pdfDoc = await PDFDocument.create();
  // @ts-ignore
  pdfDoc.registerFontkit(fontkit);

  const basePagesAndBoxes = await getBasePagesAndEmbedPdfBoxes({ template, pdfDoc, basePdf });
  const { basePages, embedPdfBoxes } = basePagesAndBoxes;

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

  return { pdfDoc, basePages, embedPdfBoxes, renderObj };
};

export const postProcessing = (props: { pdfDoc: PDFDocument; options: GeneratorOptions }) => {
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

export const insertPage = (arg: {
  basePage: PDFEmbeddedPage | PDFPage;
  embedPdfBox: EmbedPdfBox;
  pdfDoc: PDFDocument;
}) => {
  const { basePage, embedPdfBox, pdfDoc } = arg;
  const size = basePage instanceof PDFEmbeddedPage ? basePage.size() : basePage.getSize();
  const insertedPage = pdfDoc.addPage([size.width, size.height]);

  if (basePage instanceof PDFEmbeddedPage) {
    insertedPage.drawPage(basePage);
    const { mediaBox, bleedBox, trimBox } = embedPdfBox;
    insertedPage.setMediaBox(mediaBox.x, mediaBox.y, mediaBox.width, mediaBox.height);
    insertedPage.setBleedBox(bleedBox.x, bleedBox.y, bleedBox.width, bleedBox.height);
    insertedPage.setTrimBox(trimBox.x, trimBox.y, trimBox.width, trimBox.height);
  }

  return insertedPage;
};

// TODO ここから
// とりあえずフォームから行数を増やして、改ページできるようにする
// ここで schema.y よりも大きい他のスキーマの y を増加させる
// さらにオーバーフローした場合は、ページを追加する

interface ModifyTemplateForDynamicTableArg {
  template: Template;
  input: Record<string, string>;
  _cache: Map<any, any>;
  options: GeneratorOptions;
}
/*
 * テーブルの行数が増えた場合、その分、そのテーブルより下のスキーマの y を増加/減少させる
 */
export const modifyTemplateForDynamicTable = async (arg: ModifyTemplateForDynamicTableArg) => {
  const { template, input, _cache, options } = arg;
  const diffMap = await calculateDiffMap({ template, input, _cache, options });
  updateSchemaPositions(template, diffMap);
  console.log(diffMap);
};

async function calculateDiffMap(arg: ModifyTemplateForDynamicTableArg) {
  const { template, input, _cache, options } = arg;
  // TODO 
  const diffMap: { [y: number]: number } = {};
  for (const schemaObj of template.schemas) {
    for (const [key, schema] of Object.entries(schemaObj)) {
      if (schema.type !== 'table') continue;
      const body = JSON.parse(input[key] || '[]') as string[][];
      const pageWidth = (template.basePdf as Size).width;
      const tableArg = { schema, options, _cache };
      const table = await autoTable(body, tableArg, pageWidth);
      diffMap[schema.position.y + schema.height] = table.getHeight() - schema.height;
    }
  }
  return diffMap;
}

function updateSchemaPositions(template: Template, diffMap: { [y: number]: number }) {
  for (const schemaObj of template.schemas) {
    for (const schema of Object.values(schemaObj)) {
      for (const [diffKey, diffValue] of Object.entries(diffMap)) {
        if (schema.position.y > Number(diffKey)) {
          schema.position.y += diffValue;
        }
        // TODO ここから
        // ここで schema.y + schema.height がページの高さを超えた場合、ページを追加する

      }
    }
  }
}
