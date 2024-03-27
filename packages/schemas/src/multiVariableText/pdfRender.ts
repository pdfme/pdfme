import { PDFRenderProps } from '@pdfme/common';
import { MultiVariableTextSchema } from './types';
import { pdfRender as parentPdfRender } from '../text/pdfRender';
import { substituteVariables } from './helper';

export const pdfRender = async (arg: PDFRenderProps<MultiVariableTextSchema>) => {
  const { value, schema, ...rest } = arg;

  const substitutedText = substituteVariables(schema.content || '', value);

  const renderArgs = {
    value: substitutedText,
    schema,
    ...rest,
  };

  await parentPdfRender(renderArgs);
};
