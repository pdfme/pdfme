import { PDFRenderProps } from '@pdfme/common';
import { MultiVariableTextSchema } from './types.js';
import { pdfRender as parentPdfRender } from '../text/pdfRender.js';
import { substituteVariables, validateVariables } from './helper.js';

export const pdfRender = async (arg: PDFRenderProps<MultiVariableTextSchema>) => {
  const { value, schema, ...rest } = arg;

  if (!validateVariables(value, schema)) {
    // Don't render if a required variable is missing
    return;
  }

  const renderArgs = {
    value: substituteVariables(schema.text || '', value),
    schema,
    ...rest,
  };

  await parentPdfRender(renderArgs);
};
