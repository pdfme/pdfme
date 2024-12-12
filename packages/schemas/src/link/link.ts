import { PDFRenderProps, Plugin } from "@pdfme/common";
import { PDFName, PDFString } from "@pdfme/pdf-lib";
import { Link } from "lucide";
import text from "../text";
import { pdfRender as parentPdfRender } from "../text/pdfRender";
import { TextSchema } from "../text/types";
import { convertForPdfLayoutProps, createSvgStr } from "../utils.ts";

// inputs : [["text"],["url"]]

export interface LinkSchema extends TextSchema {
  url: string;
}

export const link: Plugin<LinkSchema> = {
  ui: text.ui,
  pdf: async (arg: PDFRenderProps<LinkSchema>) => {
    const { value, pdfDoc, schema, page, ...rest } = arg;
    const pageHeight = page.getHeight();
    const {
      width,
      height,
      position: { x, y },
    } = convertForPdfLayoutProps({ schema, pageHeight, applyRotateTranslate: false });
    const values: string[][] = JSON.parse(value);

    const linkAnnotation = pdfDoc.context.register(
      pdfDoc.context.obj({
        Type: "Annot",
        Subtype: "Link",
        Rect: [x, y, x + width, y + height],
        Border: [0, 0, 2],
        C: [0, 0, 1],
        A: {
          Type: "Action",
          S: "URI",
          URI: PDFString.of(values[0][1]),
        },
      }),
    );

    page.node.set(PDFName.of("Annots"), pdfDoc.context.obj([linkAnnotation]));
    console.log(values);
    const renderArgs = {
      value: values[0][0],
      pdfDoc: pdfDoc,
      schema,
      page: page,
      ...rest,
    };

    await parentPdfRender(renderArgs);
  },
  propPanel: {
    schema: {
      ...text.propPanel.schema,
    },
    defaultSchema: {
      ...text.propPanel.defaultSchema,
      rotate: undefined,
      type: "link",
      url: "",
    },
  },
  icon: createSvgStr(Link),
};

export default link;
