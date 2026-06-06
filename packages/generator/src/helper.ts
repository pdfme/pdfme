import * as fontkit from 'fontkit';
import {
  Schema,
  Plugins,
  GeneratorOptions,
  Template,
  PDFRenderProps,
  getB64BasePdf,
  isBlankPdf,
  mm2pt,
  normalizeSafeLinkUri,
  pluginRegistry,
  BasePdf,
} from '@pdfme/common';
import { builtInPlugins } from '@pdfme/schemas/builtins';
import {
  PDFPage,
  PDFDocument,
  PDFEmbeddedPage,
  PDFDict,
  PDFName,
  PDFArray,
  PDFObjectCopier,
  PDFString,
  PDFHexString,
  EncryptedPDFError,
} from '@pdfme/pdf-lib';
import { TOOL_NAME } from './constants.js';
import type { EmbedPdfBox, PdfBox } from './types.js';

const isEncryptedPdfError = (error: unknown) =>
  error instanceof EncryptedPDFError ||
  (error instanceof Error &&
    error.message.startsWith('Input document to `PDFDocument.load` is encrypted.'));

const isPasswordFailure = (error: unknown) =>
  error instanceof Error &&
  (error.message === 'NEEDS PASSWORD' || error.message === 'Password incorrect');

const loadBasePdfWithPassword = async (
  pdf: string | Uint8Array | ArrayBuffer,
  password: string,
) => {
  try {
    return await PDFDocument.load(pdf, { password });
  } catch (error) {
    if (!isPasswordFailure(error)) {
      throw error;
    }
    throw new Error(
      '[@pdfme/generator] basePdf is encrypted and requires a valid password. Pass options.basePdfPassword to generate().',
    );
  }
};

const loadBasePdf = async (pdf: string | Uint8Array | ArrayBuffer, password?: string) => {
  if (password !== undefined) {
    return loadBasePdfWithPassword(pdf, password);
  }

  try {
    return await PDFDocument.load(pdf);
  } catch (error) {
    if (!isEncryptedPdfError(error)) {
      throw error;
    }
    return loadBasePdfWithPassword(pdf, '');
  }
};

const getBasePdfPassword = (options?: GeneratorOptions) => {
  const password = options?.basePdfPassword;
  return typeof password === 'string' ? password : undefined;
};

const toBoundingBox = ({ x, y, width, height }: PdfBox) => ({
  left: x,
  bottom: y,
  right: x + width,
  top: y + height,
});

const toOriginBox = ({ width, height }: PdfBox): PdfBox => ({ x: 0, y: 0, width, height });

const getVisibleRect = (rect: PdfBox, sourceBox?: PdfBox): PdfBox | undefined => {
  if (!sourceBox) {
    return rect;
  }

  const left = Math.max(rect.x, sourceBox.x);
  const bottom = Math.max(rect.y, sourceBox.y);
  const right = Math.min(rect.x + rect.width, sourceBox.x + sourceBox.width);
  const top = Math.min(rect.y + rect.height, sourceBox.y + sourceBox.height);
  if (right <= left || top <= bottom) {
    return undefined;
  }

  return {
    x: left - sourceBox.x,
    y: bottom - sourceBox.y,
    width: right - left,
    height: top - bottom,
  };
};

export const getEmbedPdfPages = async (arg: {
  options?: GeneratorOptions;
  pdfDoc: PDFDocument;
  template: Template;
}) => {
  const {
    template: { schemas, basePdf },
    options,
    pdfDoc,
  } = arg as {
    options?: GeneratorOptions;
    template: { schemas: Schema[][]; basePdf: BasePdf };
    pdfDoc: PDFDocument;
  };
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
    const embedPdf = await loadBasePdf(willLoadPdf, getBasePdfPassword(options));
    const embedPdfPages = embedPdf.getPages();
    const sourceBoxes = embedPdfPages.map((p) => p.getCropBox());
    embedPdfBoxes = embedPdfPages.map((p, index) => {
      const sourceBox = sourceBoxes[index];
      const outputBox = toOriginBox(sourceBox);
      return {
        mediaBox: outputBox,
        bleedBox: outputBox,
        trimBox: outputBox,
        sourceBox,
        sourcePage: p,
      };
    });
    const boundingBoxes = sourceBoxes.map(toBoundingBox);
    basePages = await pdfDoc.embedPages(embedPdfPages, boundingBoxes);
  }
  return { basePages, embedPdfBoxes };
};

const getSafeUriFromLinkAnnotation = (annotation: PDFDict) => {
  if (annotation.lookupMaybe(PDFName.of('Subtype'), PDFName) !== PDFName.of('Link')) return;

  const action = annotation.lookupMaybe(PDFName.of('A'), PDFDict);
  if (!action) return;

  if (action.lookupMaybe(PDFName.of('S'), PDFName) !== PDFName.of('URI')) return;

  const uri = action.lookupMaybe(PDFName.of('URI'), PDFString, PDFHexString);
  return uri ? normalizeSafeLinkUri(uri.decodeText()) : undefined;
};

const copyBasePdfUriLinkAnnotations = (arg: {
  sourceBox?: PdfBox;
  sourcePage: PDFPage;
  targetPage: PDFPage;
  pdfDoc: PDFDocument;
}) => {
  const { sourceBox, sourcePage, targetPage, pdfDoc } = arg;
  const sourceAnnots = sourcePage.node.Annots();
  if (!sourceAnnots) return;

  const copier = PDFObjectCopier.for(sourcePage.doc.context, pdfDoc.context);

  for (let idx = 0; idx < sourceAnnots.size(); idx += 1) {
    const sourceAnnotation = sourceAnnots.lookupMaybe(idx, PDFDict);
    if (!sourceAnnotation) continue;

    const safeUri = getSafeUriFromLinkAnnotation(sourceAnnotation);
    if (!safeUri) continue;
    const rect = sourceAnnotation.lookupMaybe(PDFName.of('Rect'), PDFArray);
    if (!rect) continue;
    const visibleRect = getVisibleRect(rect.asRectangle(), sourceBox);
    if (!visibleRect) continue;

    const border = sourceAnnotation.lookupMaybe(PDFName.of('Border'), PDFArray);
    const color = sourceAnnotation.lookupMaybe(PDFName.of('C'), PDFArray);
    const highlightMode = sourceAnnotation.lookupMaybe(PDFName.of('H'), PDFName);

    // Preserve the clickable area and common link hints, but rebuild the URI action so page-bound
    // or unsafe source annotation data is not copied into the generated document.
    const copiedAnnotation = pdfDoc.context.obj({
      Type: PDFName.of('Annot'),
      Subtype: PDFName.of('Link'),
      Rect: [
        visibleRect.x,
        visibleRect.y,
        visibleRect.x + visibleRect.width,
        visibleRect.y + visibleRect.height,
      ],
      Border: border ? copier.copy(border) : pdfDoc.context.obj([0, 0, 0]),
      C: color ? copier.copy(color) : undefined,
      H: highlightMode ? copier.copy(highlightMode) : undefined,
      A: {
        Type: PDFName.of('Action'),
        S: PDFName.of('URI'),
        URI: PDFString.of(safeUri),
      },
    });

    targetPage.node.addAnnot(pdfDoc.context.register(copiedAnnotation));
  }
};

export const validateRequiredFields = (template: Template, inputs: Record<string, unknown>[]) => {
  template.schemas.forEach((schemaPage: Schema[]) =>
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

  const plugins = pluginRegistry(
    Object.values(userPlugins).length > 0 ? userPlugins : builtInPlugins,
  );

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
      const plugin = plugins.findByType(type);

      if (!plugin || !plugin.pdf) {
        throw new Error(`[@pdfme/generator] Plugin or renderer for type ${type} not found.
Check this document: https://pdfme.com/docs/custom-schemas`);
      }

      // Use type assertion to handle the pdf function with schema type
      return {
        ...acc,
        [type]: plugin.pdf as (
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
    if (embedPdfBox.sourcePage) {
      copyBasePdfUriLinkAnnotations({
        sourceBox: embedPdfBox.sourceBox,
        sourcePage: embedPdfBox.sourcePage,
        targetPage: insertedPage,
        pdfDoc,
      });
    }
  }

  return insertedPage;
};
