import { PDFRenderProps } from '@pdfme/common';
import { AdvancedTextSchema } from './types';
import { pdfRender as parentPdfRender } from '../text/pdfRender';
import { substituteVariables } from './helper';

export const pdfRender = async (arg: PDFRenderProps<AdvancedTextSchema>) => {
  const { value, schema, ...rest } = arg;

  const content = substituteVariables(schema.content || '', value);

  const renderArgs = {
    value: content,
    schema,
    ...rest,
  };

  await parentPdfRender(renderArgs);
};
