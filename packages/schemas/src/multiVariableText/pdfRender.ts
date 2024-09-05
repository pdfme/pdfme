import { PDFRenderProps } from '@pdfme/common';
import { MultiVariableTextSchema } from './types';
import { pdfRender as parentPdfRender } from '../text/pdfRender';
import { substituteVariables, validateVariables } from './helper';

export const pdfRender = async (arg: PDFRenderProps<MultiVariableTextSchema>) => {
  const { key, value, schema, ...rest } = arg;

  if (!validateVariables(key, value, schema)) {
    // Don't render if a required variable is missing
    return;
  }

  const renderArgs = {
    key,
    value: substituteVariables(schema.text || '', value),
    schema,
    ...rest,
  };

  await parentPdfRender(renderArgs);
};
